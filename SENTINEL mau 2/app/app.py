from flask import Flask, render_template, request, redirect, url_for, flash, session, Response, jsonify
from config import Config
import bcrypt
import csv
import io
import os
import asyncio
import json
import threading
import requests
from datetime import datetime
from pathlib import Path
from urllib.parse import quote_plus, urlparse, parse_qs

app = Flask(__name__)
app.config.from_object(Config)


import pymysql

class MySQLCompatibleCursor:
    def __init__(self, cursor):
        self.cursor = cursor
        self.description = None

    def execute(self, query, *args):
        # 1. Replace placeholder '?' with '%s'
        query = query.replace('?', '%s')
        
        # 2. Strip 'dbo.' schema prefix
        query = query.replace('dbo.', '')
        
        # 3. Translate 'SELECT TOP N' to 'SELECT ... LIMIT N'
        top_match = re.search(r'SELECT\s+TOP\s+(\d+)\s+', query, re.IGNORECASE)
        if top_match:
            limit_val = top_match.group(1)
            query = re.sub(r'SELECT\s+TOP\s+\d+\s+', 'SELECT ', query, flags=re.IGNORECASE)
            # Append LIMIT if it's not already there
            if 'LIMIT' not in query.upper():
                query += f' LIMIT {limit_val}'

        # 4. Strip stored procedure EXEC calls
        if query.strip().upper().startswith('EXEC '):
            # Strip EXEC and procedure name prefix if any
            proc_call = query.strip()[5:].strip()
            # Simple conversion of execution calls
            query = f"CALL {proc_call}"

        # 5. Handle single array wrapper when args is passed as a tuple of list
        flat_args = []
        for a in args:
            if isinstance(a, (list, tuple)):
                flat_args.extend(a)
            else:
                flat_args.append(a)

        res = self.cursor.execute(query, flat_args or None)
        self.description = self.cursor.description
        return res

    def fetchall(self):
        return self.cursor.fetchall()

    def fetchone(self):
        return self.cursor.fetchone()

    def close(self):
        self.cursor.close()


class MySQLConnectionWrapper:
    def __init__(self, conn):
        self.conn = conn

    def cursor(self):
        return MySQLCompatibleCursor(self.conn.cursor())

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

    def close(self):
        self.conn.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.conn.close()


import re

def get_conn():
    conn = pymysql.connect(
        host='127.0.0.1',
        port=3306,
        user='root',
        password='Pianoverde2012',
        database='SENTINEL_DB',
        charset='utf8mb4'
    )
    return MySQLConnectionWrapper(conn)


def rows_to_dicts(cursor):
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def row_to_dict(cursor):
    row = cursor.fetchone()
    if row is None:
        return None
    columns = [col[0] for col in cursor.description]
    return dict(zip(columns, row))


def require_login():
    return 'usuario' in session


def si_no_from_checkbox(name):
    return 'Sí' if request.form.get(name) else 'No'


def bool_for_template(value):
    return 1 if str(value or '').strip().lower() in ('sí', 'si', '1', 'true', 'validado', 'aprobado', 'activa', 'activo') else 0


def normalize_estado_template(value):
    ev = str(value or '').strip().lower()
    if ev in ('aprobado', 'validado'):
        return 'validado'
    if ev in ('rechazado', 'no relevante', 'enlace inválido', 'enlace invalido'):
        return 'rechazado'
    return 'pendiente'


def normalizar_texto(valor):
    """Normaliza texto para comparar duplicados sin afectar el valor guardado."""
    return str(valor or '').strip().lower()


def normalizar_url(valor):
    """Normaliza URLs para detectar duplicados comunes por espacios o diagonal final."""
    return str(valor or '').strip().rstrip('/').lower()


def variantes_url(valor):
    base = normalizar_url(valor)
    if not base:
        return []
    return [base, base + '/']


def buscar_posible_duplicado(cur, nombre, url_facebook, url_web=None, excluir_id=None):
    """Busca duplicados activos por URL Facebook, URL web y nombre exacto.

    No borra ni modifica registros; solo devuelve mensajes para impedir
    altas/actualizaciones duplicadas desde el CRUD.
    """
    mensajes = []
    parametros_exclusion = []
    filtro_exclusion = ''

    if excluir_id is not None:
        filtro_exclusion = ' AND id_fuente <> ?'
        parametros_exclusion = [excluir_id]

    fb_variantes = variantes_url(url_facebook)
    if fb_variantes:
        placeholders = ','.join('?' for _ in fb_variantes)
        cur.execute(f"""
            SELECT TOP 1 id_fuente, sitio, url_facebook
            FROM dbo.fuentes
            WHERE activo_sistema = 1
              AND LOWER(LTRIM(RTRIM(url_facebook))) IN ({placeholders})
              {filtro_exclusion}
            ORDER BY id_fuente
        """, *(fb_variantes + parametros_exclusion))
        existente = row_to_dict(cur)
        if existente:
            mensajes.append(
                f"la URL de Facebook ya existe en el registro #{existente['id_fuente']} "
                f"({existente['sitio']})"
            )

    web_variantes = variantes_url(url_web)
    if web_variantes:
        placeholders = ','.join('?' for _ in web_variantes)
        cur.execute(f"""
            SELECT TOP 1 id_fuente, sitio, url_web
            FROM dbo.fuentes
            WHERE activo_sistema = 1
              AND url_web IS NOT NULL
              AND LOWER(LTRIM(RTRIM(url_web))) IN ({placeholders})
              {filtro_exclusion}
            ORDER BY id_fuente
        """, *(web_variantes + parametros_exclusion))
        existente = row_to_dict(cur)
        if existente:
            mensajes.append(
                f"la URL web ya existe en el registro #{existente['id_fuente']} "
                f"({existente['sitio']})"
            )

    nombre_normalizado = normalizar_texto(nombre)
    if nombre_normalizado:
        cur.execute(f"""
            SELECT TOP 1 id_fuente, sitio
            FROM dbo.fuentes
            WHERE activo_sistema = 1
              AND LOWER(LTRIM(RTRIM(sitio))) = ?
              {filtro_exclusion}
            ORDER BY id_fuente
        """, *([nombre_normalizado] + parametros_exclusion))
        existente = row_to_dict(cur)
        if existente:
            mensajes.append(
                f"ya existe una fuente con ese nombre en el registro #{existente['id_fuente']} "
                f"({existente['sitio']})"
            )

    return mensajes


def get_categorias_por_nivel():
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute('''
            SELECT id_categoria AS id, nombre_categoria AS nombre, id_padre, nivel
            FROM dbo.categorias
            WHERE activa = 1
            ORDER BY nivel, nombre_categoria
        ''')
        todas = rows_to_dicts(cur)
    return (
        [c for c in todas if c['nivel'] == 1],
        [c for c in todas if c['nivel'] == 2],
        [c for c in todas if c['nivel'] == 3]
    )


def get_fuente_form(id_fuente):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute('''
            SELECT id_fuente AS id, sitio AS nombre, url_web, url_facebook,
                   municipio, estado, pais, tipo_fuente,
                   enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones,
                   id_categoria_raiz, id_subcategoria, id_tipo_especifico, id_categoria,
                   categoria_raiz, subcategoria, tipo_especifico
            FROM dbo.vw_fuentes_detalle
            WHERE id_fuente = ? AND activo_sistema = 1
        ''', id_fuente)
        pagina = row_to_dict(cur)
    if pagina:
        pagina['enlace_valido_bool'] = bool_for_template(pagina.get('enlace_valido'))
        pagina['pagina_activa_bool'] = bool_for_template(pagina.get('pagina_activa'))
        pagina['duplicado_bool'] = bool_for_template(pagina.get('duplicado'))
    return pagina


@app.route('/')
def inicio():
    if not require_login():
        return redirect(url_for('login'))
    busqueda = request.args.get('q', '').strip()
    with get_conn() as conn:
        cur = conn.cursor()
        if busqueda:
            cur.execute('''
                SELECT id_fuente AS id, sitio AS nombre, url_facebook, url_web,
                       municipio, estado, tipo_fuente, enlace_valido, pagina_activa,
                       duplicado, estado_validacion, categoria_raiz, subcategoria,
                       tipo_especifico, agregado_por, fecha_registro AS creado_en
                FROM dbo.vw_fuentes_detalle
                WHERE activo_sistema = 1
                  AND (sitio LIKE ? OR categoria_raiz LIKE ? OR subcategoria LIKE ? OR tipo_especifico LIKE ? OR municipio LIKE ? OR tipo_fuente LIKE ?)
                ORDER BY sitio
            ''', *(f'%{busqueda}%' for _ in range(6)))
        else:
            cur.execute('''
                SELECT id_fuente AS id, sitio AS nombre, url_facebook, url_web,
                       municipio, estado, tipo_fuente, enlace_valido, pagina_activa,
                       duplicado, estado_validacion, categoria_raiz, subcategoria,
                       tipo_especifico, agregado_por, fecha_registro AS creado_en
                FROM dbo.vw_fuentes_detalle
                WHERE activo_sistema = 1
                ORDER BY sitio
            ''')
        paginas = rows_to_dicts(cur)
    for p in paginas:
        p['enlace_valido'] = bool_for_template(p.get('enlace_valido'))
        p['pagina_activa'] = bool_for_template(p.get('pagina_activa'))
        p['duplicado'] = bool_for_template(p.get('duplicado'))
        p['estado_validacion'] = normalize_estado_template(p.get('estado_validacion'))
    return render_template('index.html', paginas=paginas, busqueda=busqueda)


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email'].strip()
        password = request.form['password'].strip()
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute('SELECT id, nombre, email, password_hash FROM dbo.usuarios WHERE email = ? AND activo = 1', email)
            usuario = row_to_dict(cur)
        if usuario:
            hash_bd = usuario['password_hash'].encode('utf-8')
            pass_ingresado = password.encode('utf-8')
            if bcrypt.checkpw(pass_ingresado, hash_bd):
                session['usuario'] = usuario['nombre']
                session['usuario_id'] = usuario['id']
                flash('Bienvenido ' + usuario['nombre'], 'success')
                return redirect(url_for('inicio'))
        flash('Correo o contraseña incorrectos.', 'error')
    return render_template('login.html')


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))


@app.route('/agregar', methods=['GET', 'POST'])
def agregar():
    if not require_login():
        return redirect(url_for('login'))
    nivel1, nivel2, nivel3 = get_categorias_por_nivel()
    if request.method == 'POST':
        nombre = request.form['nombre'].strip()
        url_web = request.form['url_web'].strip() or None
        url_facebook = request.form['url_facebook'].strip()
        categoria_id = request.form.get('cat_final') or request.form.get('sel_n3') or request.form.get('sel_n2') or request.form.get('sel_n1')
        municipio = request.form.get('municipio', '').strip() or None
        estado_ubi = request.form.get('estado', 'Querétaro').strip() or 'Querétaro'
        pais = request.form.get('pais', 'México').strip() or 'México'
        tipo_fuente = request.form.get('tipo_fuente', '').strip() or None
        enlace_valido = si_no_from_checkbox('enlace_valido')
        pagina_activa = si_no_from_checkbox('pagina_activa')
        duplicado = si_no_from_checkbox('duplicado')
        estado_validacion = request.form.get('estado_validacion', 'Pendiente')
        observaciones = request.form.get('observaciones', '').strip() or None
        if not categoria_id:
            flash('Selecciona una categoría antes de guardar.', 'error')
            return render_template('agregar.html', nivel1=nivel1, nivel2=nivel2, nivel3=nivel3)
        try:
            with get_conn() as conn:
                cur = conn.cursor()
                duplicados = buscar_posible_duplicado(cur, nombre, url_facebook, url_web)
                if duplicados:
                    flash('⚠ Posible duplicado detectado: ' + ' | '.join(duplicados), 'error')
                    return render_template('agregar.html', nivel1=nivel1, nivel2=nivel2, nivel3=nivel3)

                cur.execute('''
                    EXEC dbo.spCrearFuente
                        @sitio=?, @url_web=?, @url_facebook=?, @tipo_fuente=?, @id_categoria=?,
                        @municipio=?, @estado=?, @pais=?, @enlace_valido=?, @pagina_activa=?,
                        @duplicado=?, @estado_validacion=?, @observaciones=?, @agregado_por=?
                ''', nombre, url_web, url_facebook, tipo_fuente, int(categoria_id), municipio, estado_ubi, pais,
                     enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones, session.get('usuario', 'Sistema'))
                conn.commit()
            flash('Página registrada correctamente.', 'success')
            return redirect(url_for('inicio'))
        except Exception as e:
            flash(str(e), 'error')
    return render_template('agregar.html', nivel1=nivel1, nivel2=nivel2, nivel3=nivel3)


@app.route('/editar/<int:id>', methods=['GET', 'POST'])
def editar(id):
    if not require_login():
        return redirect(url_for('login'))
    nivel1, nivel2, nivel3 = get_categorias_por_nivel()
    if request.method == 'POST':
        nombre = request.form['nombre'].strip()
        url_web = request.form['url_web'].strip() or None
        url_facebook = request.form['url_facebook'].strip()
        categoria_id = request.form.get('cat_final') or request.form.get('sel_n3') or request.form.get('sel_n2') or request.form.get('sel_n1')
        municipio = request.form.get('municipio', '').strip() or None
        estado_ubi = request.form.get('estado', 'Querétaro').strip() or 'Querétaro'
        pais = request.form.get('pais', 'México').strip() or 'México'
        tipo_fuente = request.form.get('tipo_fuente', '').strip() or None
        enlace_valido = si_no_from_checkbox('enlace_valido')
        pagina_activa = si_no_from_checkbox('pagina_activa')
        duplicado = si_no_from_checkbox('duplicado')
        estado_validacion = request.form.get('estado_validacion', 'Pendiente')
        observaciones = request.form.get('observaciones', '').strip() or None
        if not categoria_id:
            flash('Selecciona una categoría antes de actualizar.', 'error')
        else:
            try:
                with get_conn() as conn:
                    cur = conn.cursor()
                    duplicados = buscar_posible_duplicado(cur, nombre, url_facebook, url_web, excluir_id=id)
                    if duplicados:
                        flash('⚠ Posible duplicado detectado: ' + ' | '.join(duplicados), 'error')
                        pagina = get_fuente_form(id)
                        return render_template('editar.html', pagina=pagina, nivel1=nivel1, nivel2=nivel2, nivel3=nivel3)

                    cur.execute('''
                        EXEC dbo.spActualizarFuente
                            @id_fuente=?, @sitio=?, @url_web=?, @url_facebook=?, @tipo_fuente=?, @id_categoria=?,
                            @municipio=?, @estado=?, @pais=?, @enlace_valido=?, @pagina_activa=?,
                            @duplicado=?, @estado_validacion=?, @observaciones=?
                    ''', id, nombre, url_web, url_facebook, tipo_fuente, int(categoria_id), municipio, estado_ubi, pais,
                         enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
                    conn.commit()
                flash('Página actualizada correctamente.', 'success')
                return redirect(url_for('inicio'))
            except Exception as e:
                flash(str(e), 'error')
    pagina = get_fuente_form(id)
    if not pagina:
        flash('El registro no existe o fue eliminado.', 'error')
        return redirect(url_for('inicio'))
    return render_template('editar.html', pagina=pagina, nivel1=nivel1, nivel2=nivel2, nivel3=nivel3)


@app.route('/eliminar/<int:id>')
def eliminar(id):
    if not require_login():
        return redirect(url_for('login'))
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute('EXEC dbo.spEliminarFuente @id_fuente=?', id)
        conn.commit()
    flash('Página eliminada correctamente.', 'success')
    return redirect(url_for('inicio'))


@app.route('/arquitectura')
def arquitectura():
    if not require_login():
        return redirect(url_for('login'))
    return render_template('arquitectura.html')


@app.route('/exportar')
def exportar():
    if not require_login():
        return redirect(url_for('login'))
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute('''
            SELECT sitio AS nombre, url_web, url_facebook, categoria_raiz, subcategoria, tipo_especifico,
                   municipio, estado, pais, tipo_fuente, enlace_valido, pagina_activa, duplicado,
                   estado_validacion, agregado_por, fecha_registro AS creado_en
            FROM dbo.vw_fuentes_detalle
            WHERE activo_sistema = 1
            ORDER BY categoria_raiz, subcategoria, tipo_especifico, sitio
        ''')
        paginas = rows_to_dicts(cur)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Nombre', 'Sitio Web', 'URL Facebook', 'Categoría raíz', 'Subcategoría', 'Tipo específico', 'Municipio', 'Estado', 'País', 'Tipo fuente', 'Enlace válido', 'Página activa', 'Duplicado', 'Estado validación', 'Agregado por', 'Fecha de registro'])
    for p in paginas:
        writer.writerow([p.get('nombre'), p.get('url_web') or '', p.get('url_facebook'), p.get('categoria_raiz'), p.get('subcategoria'), p.get('tipo_especifico'), p.get('municipio'), p.get('estado'), p.get('pais'), p.get('tipo_fuente'), p.get('enlace_valido'), p.get('pagina_activa'), p.get('duplicado'), p.get('estado_validacion'), p.get('agregado_por'), p.get('creado_en')])
    output.seek(0)
    return Response(output.getvalue(), mimetype='text/csv; charset=utf-8', headers={'Content-Disposition': 'attachment; filename=SENTINEL_fuentes.csv'})


@app.route('/exportar/equipo2.csv')
def exportar_equipo2_csv():
    if not require_login():
        return redirect(url_for('login'))
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute('SELECT url_facebook FROM dbo.vw_equipo2_urls ORDER BY url_facebook')
        urls = rows_to_dicts(cur)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['url_facebook'])
    for u in urls:
        writer.writerow([u['url_facebook']])
    output.seek(0)
    return Response(output.getvalue(), mimetype='text/csv; charset=utf-8', headers={'Content-Disposition': 'attachment; filename=SENTINEL_equipo2_urls.csv'})


@app.route('/exportar/equipo2.json')
def exportar_equipo2_json():
    if not require_login():
        return redirect(url_for('login'))
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute('SELECT url_facebook FROM dbo.vw_equipo2_urls ORDER BY url_facebook')
        urls = rows_to_dicts(cur)
    return jsonify(urls)


@app.route('/api/dashboard')
def api_dashboard():
    try:
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute('SELECT COUNT(*) AS total FROM dbo.fuentes WHERE activo_sistema=1')
            total_fuentes = row_to_dict(cur)['total']
            cur.execute('SELECT COUNT(*) AS total FROM dbo.usuarios WHERE activo=1')
            total_usuarios = row_to_dict(cur)['total']
            cur.execute('SELECT COUNT(*) AS total FROM dbo.categorias WHERE activa=1')
            total_categorias = row_to_dict(cur)['total']
            cur.execute('''
                SELECT categoria_raiz AS nombre, COUNT(*) AS total
                FROM dbo.vw_fuentes_detalle
                WHERE activo_sistema=1
                GROUP BY categoria_raiz
                ORDER BY total DESC
            ''')
            por_categoria = rows_to_dicts(cur)
            cur.execute('''
                SELECT TOP 8 id_fuente AS id, sitio AS nombre, url_facebook, url_web,
                       categoria_raiz, subcategoria, tipo_especifico, municipio, estado, pais,
                       tipo_fuente, enlace_valido, pagina_activa, duplicado, estado_validacion,
                       agregado_por, fecha_registro AS creado_en
                FROM dbo.vw_fuentes_detalle
                WHERE activo_sistema=1
                ORDER BY fecha_registro DESC, id_fuente DESC
            ''')
            ultimos = rows_to_dicts(cur)
            for u in ultimos:
                u['enlace_valido'] = bool_for_template(u.get('enlace_valido'))
                u['pagina_activa'] = bool_for_template(u.get('pagina_activa'))
                u['duplicado'] = bool_for_template(u.get('duplicado'))
                u['estado_validacion'] = normalize_estado_template(u.get('estado_validacion'))
            cur.execute('''
                SELECT agregado_por AS nombre, COUNT(*) AS total
                FROM dbo.vw_fuentes_detalle
                WHERE activo_sistema=1
                GROUP BY agregado_por
                ORDER BY total DESC
            ''')
            por_usuario = rows_to_dicts(cur)
        return jsonify({
            'total_fuentes': total_fuentes,
            'total_categorias': total_categorias,
            'total_usuarios': total_usuarios,
            'por_categoria': por_categoria,
            'por_usuario': por_usuario,
            'ultimos': ultimos
        })
    except Exception as e:
        return jsonify({'error': 'db_error', 'message': str(e)}), 500


@app.route('/api/fuentes', methods=['GET', 'POST'])
def api_fuentes():
    try:
        with get_conn() as conn:
            cur = conn.cursor()
            if request.method == 'GET':
                busqueda = request.args.get('q', '').strip()
                if busqueda:
                    cur.execute('''
                        SELECT id_fuente AS id, sitio AS nombre, url_facebook, url_web,
                               municipio, estado, pais, tipo_fuente, enlace_valido, pagina_activa,
                               duplicado, estado_validacion, categoria_raiz, subcategoria,
                               tipo_especifico, agregado_por, fecha_registro AS creado_en
                        FROM dbo.vw_fuentes_detalle
                        WHERE activo_sistema = 1
                          AND (sitio LIKE ? OR categoria_raiz LIKE ? OR subcategoria LIKE ? OR tipo_especifico LIKE ? OR municipio LIKE ? OR tipo_fuente LIKE ?)
                        ORDER BY sitio
                    ''', *(f'%{busqueda}%' for _ in range(6)))
                else:
                    cur.execute('''
                        SELECT id_fuente AS id, sitio AS nombre, url_facebook, url_web,
                               municipio, estado, pais, tipo_fuente, enlace_valido, pagina_activa,
                               duplicado, estado_validacion, categoria_raiz, subcategoria,
                               tipo_especifico, agregado_por, fecha_registro AS creado_en
                        FROM dbo.vw_fuentes_detalle
                        WHERE activo_sistema = 1
                        ORDER BY sitio
                    ''')
                paginas = rows_to_dicts(cur)
                for p in paginas:
                    p['enlace_valido'] = bool_for_template(p.get('enlace_valido'))
                    p['pagina_activa'] = bool_for_template(p.get('pagina_activa'))
                    p['duplicado'] = bool_for_template(p.get('duplicado'))
                    p['estado_validacion'] = normalize_estado_template(p.get('estado_validacion'))
                return jsonify({'fuentes': paginas, 'total': len(paginas)})

            elif request.method == 'POST':
                data = request.json or {}
                nombre = data.get('nombre', '').strip()
                url_web = data.get('url_web', '').strip() or None
                url_facebook = data.get('url_facebook', '').strip()
                categoria_id = data.get('categoria_id')
                municipio = data.get('municipio', '').strip() or None
                estado_ubi = data.get('estado', 'Querétaro').strip() or 'Querétaro'
                pais = data.get('pais', 'México').strip() or 'México'
                tipo_fuente = data.get('tipo_fuente', '').strip() or None
                enlace_valido = 'Sí' if data.get('enlace_valido') else 'No'
                pagina_activa = 'Sí' if data.get('pagina_activa') else 'No'
                duplicado = 'Sí' if data.get('duplicado') else 'No'
                estado_validacion = data.get('estado_validacion', 'Pendiente')
                observaciones = data.get('observaciones', '').strip() or None

                if not nombre or not url_facebook:
                    return jsonify({'error': 'validation_error', 'message': 'Nombre y URL Facebook son obligatorios'}), 400

                # Auto select category if not explicitly provided
                if not categoria_id:
                    cur.execute("SELECT TOP 1 id_categoria FROM dbo.categorias WHERE activa=1 ORDER BY id_categoria")
                    row = cur.fetchone()
                    categoria_id = row[0] if row else 1

                duplicados = buscar_posible_duplicado(cur, nombre, url_facebook, url_web)
                if duplicados:
                    return jsonify({'error': 'duplicado', 'message': 'Posible duplicado detectado: ' + ' | '.join(duplicados)}), 400

                cur.execute('''
                    EXEC dbo.spCrearFuente
                        @sitio=?, @url_web=?, @url_facebook=?, @tipo_fuente=?, @id_categoria=?,
                        @municipio=?, @estado=?, @pais=?, @enlace_valido=?, @pagina_activa=?,
                        @duplicado=?, @estado_validacion=?, @observaciones=?, @agregado_por=?
                ''', nombre, url_web, url_facebook, tipo_fuente, int(categoria_id), municipio, estado_ubi, pais,
                     enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones, 'Admin Portal')
                conn.commit()
                
                cur.execute('SELECT TOP 1 id_fuente FROM dbo.fuentes WHERE url_facebook=? ORDER BY id_fuente DESC', url_facebook)
                nueva = cur.fetchone()
                return jsonify({'success': True, 'id': nueva[0] if nueva else None})
    except Exception as e:
        return jsonify({'error': 'db_error', 'message': str(e)}), 500


@app.route('/api/fuentes/<int:id_fuente>', methods=['GET', 'PUT', 'DELETE'])
def api_fuente_individual(id_fuente):
    try:
        with get_conn() as conn:
            cur = conn.cursor()
            if request.method == 'GET':
                pagina = get_fuente_form(id_fuente)
                if not pagina:
                    return jsonify({'error': 'not_found', 'message': 'La fuente no existe'}), 404
                return jsonify(pagina)

            elif request.method == 'PUT':
                data = request.json or {}
                nombre = data.get('nombre', '').strip()
                url_web = data.get('url_web', '').strip() or None
                url_facebook = data.get('url_facebook', '').strip()
                categoria_id = data.get('categoria_id')
                municipio = data.get('municipio', '').strip() or None
                estado_ubi = data.get('estado', 'Querétaro').strip() or 'Querétaro'
                pais = data.get('pais', 'México').strip() or 'México'
                tipo_fuente = data.get('tipo_fuente', '').strip() or None
                enlace_valido = 'Sí' if data.get('enlace_valido') else 'No'
                pagina_activa = 'Sí' if data.get('pagina_activa') else 'No'
                duplicado = 'Sí' if data.get('duplicado') else 'No'
                estado_validacion = data.get('estado_validacion', 'Pendiente')
                observaciones = data.get('observaciones', '').strip() or None

                if not nombre or not url_facebook:
                    return jsonify({'error': 'validation_error', 'message': 'Nombre y URL Facebook son obligatorios'}), 400

                if not categoria_id:
                    cur.execute("SELECT id_categoria FROM dbo.fuentes WHERE id_fuente=?", id_fuente)
                    row = cur.fetchone()
                    categoria_id = row[0] if row else 1

                duplicados = buscar_posible_duplicado(cur, nombre, url_facebook, url_web, excluir_id=id_fuente)
                if duplicados:
                    return jsonify({'error': 'duplicado', 'message': 'Posible duplicado detectado: ' + ' | '.join(duplicados)}), 400

                cur.execute('''
                    EXEC dbo.spActualizarFuente
                        @id_fuente=?, @sitio=?, @url_web=?, @url_facebook=?, @tipo_fuente=?, @id_categoria=?,
                        @municipio=?, @estado=?, @pais=?, @enlace_valido=?, @pagina_activa=?,
                        @duplicado=?, @estado_validacion=?, @observaciones=?
                ''', id_fuente, nombre, url_web, url_facebook, tipo_fuente, int(categoria_id), municipio, estado_ubi, pais,
                     enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
                conn.commit()
                return jsonify({'success': True})

            elif request.method == 'DELETE':
                cur.execute('EXEC dbo.spEliminarFuente @id_fuente=?', id_fuente)
                conn.commit()
                return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': 'db_error', 'message': str(e)}), 500


@app.route('/api/categorias', methods=['GET', 'POST'])
def api_categorias():
    try:
        with get_conn() as conn:
            cur = conn.cursor()
            if request.method == 'GET':
                n1, n2, n3 = get_categorias_por_nivel()
                return jsonify({
                    'nivel1': n1,
                    'nivel2': n2,
                    'nivel3': n3
                })
            elif request.method == 'POST':
                data = request.json or {}
                nivel = int(data.get('nivel', 1))
                nombre = data.get('nombre', '').strip()
                descripcion = data.get('descripcion', '').strip() or None
                palabras_clave = data.get('palabras_clave', '').strip() or None
                id_padre = data.get('id_padre')
                id_padre = int(id_padre) if id_padre else None

                if not nombre:
                    return jsonify({'error': 'validation_error', 'message': 'El nombre es obligatorio'}), 400

                codigo = sugerir_codigo_taxonomia(cur, nivel, id_padre)
                if not codigo:
                    return jsonify({'error': 'codigo_error', 'message': 'No se pudo generar el código automático'}), 400

                cur.execute('''
                    INSERT INTO dbo.categorias (nombre_categoria, descripcion, palabras_clave, id_padre, nivel, codigo, activa)
                    VALUES (?, ?, ?, ?, ?, ?, 1)
                ''', nombre, descripcion, palabras_clave, id_padre, nivel, codigo)
                conn.commit()
                return jsonify({'success': True, 'codigo': codigo})
    except Exception as e:
        return jsonify({'error': 'db_error', 'message': str(e)}), 500


@app.route('/api/categorias/<int:id_categoria>', methods=['PUT', 'DELETE'])
def api_categoria_individual(id_categoria):
    try:
        with get_conn() as conn:
            cur = conn.cursor()
            if request.method == 'PUT':
                data = request.json or {}
                nivel = int(data.get('nivel', 1))
                nombre = data.get('nombre', '').strip()
                descripcion = data.get('descripcion', '').strip() or None
                palabras_clave = data.get('palabras_clave', '').strip() or None
                id_padre = data.get('id_padre')
                id_padre = int(id_padre) if id_padre else None

                if not nombre:
                    return jsonify({'error': 'validation_error', 'message': 'El nombre es obligatorio'}), 400

                # Get existing code
                codigo_actual, padre_actual, nivel_actual = obtener_codigo_actual(cur, id_categoria)
                if int(nivel_actual) == int(nivel) and (padre_actual or None) == (id_padre or None):
                    codigo = codigo_actual
                else:
                    codigo = sugerir_codigo_taxonomia(cur, nivel, id_padre, excluir_id=id_categoria)

                cur.execute('''
                    UPDATE dbo.categorias
                    SET nombre_categoria = ?, codigo = ?, descripcion = ?, palabras_clave = ?, id_padre = ?
                    WHERE id_categoria = ? AND nivel = ?
                ''', nombre, codigo, descripcion, palabras_clave, id_padre, id_categoria, nivel)
                conn.commit()
                return jsonify({'success': True, 'codigo': codigo})

            elif request.method == 'DELETE':
                cur.execute('SELECT COUNT(*) AS total FROM dbo.categorias WHERE id_padre = ?', id_categoria)
                hijos = row_to_dict(cur)['total']
                cur.execute('SELECT COUNT(*) AS total FROM dbo.fuentes WHERE id_categoria = ? AND activo_sistema = 1', id_categoria)
                fuentes = row_to_dict(cur)['total']
                if hijos or fuentes:
                    cur.execute('UPDATE dbo.categorias SET activa = 0 WHERE id_categoria = ?', id_categoria)
                    conn.commit()
                    return jsonify({'success': True, 'message': 'El elemento tiene dependencias, por seguridad fue desactivado en lugar de eliminarse'})
                else:
                    cur.execute('DELETE FROM dbo.categorias WHERE id_categoria = ?', id_categoria)
                    conn.commit()
                    return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': 'db_error', 'message': str(e)}), 500


@app.route('/dashboard')
def dashboard():
    if not require_login():
        return redirect(url_for('login'))
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute('SELECT COUNT(*) AS total FROM dbo.fuentes WHERE activo_sistema=1')
        total_paginas = row_to_dict(cur)['total']
        cur.execute('SELECT COUNT(*) AS total FROM dbo.usuarios WHERE activo=1')
        total_usuarios = row_to_dict(cur)['total']
        cur.execute('SELECT COUNT(*) AS total FROM dbo.categorias WHERE activa=1')
        total_categorias = row_to_dict(cur)['total']
        cur.execute('''
            SELECT categoria_raiz AS nombre, COUNT(*) AS total
            FROM dbo.vw_fuentes_detalle
            WHERE activo_sistema=1
            GROUP BY categoria_raiz
            ORDER BY total DESC
        ''')
        por_categoria = rows_to_dicts(cur)
        cur.execute('''
            SELECT TOP 8 sitio AS nombre, url_facebook, categoria_raiz AS categoria,
                   agregado_por, fecha_registro AS creado_en
            FROM dbo.vw_fuentes_detalle
            WHERE activo_sistema=1
            ORDER BY fecha_registro DESC, id_fuente DESC
        ''')
        ultimos = rows_to_dicts(cur)
        cur.execute('''
            SELECT agregado_por AS nombre, COUNT(*) AS total
            FROM dbo.vw_fuentes_detalle
            WHERE activo_sistema=1
            GROUP BY agregado_por
            ORDER BY total DESC
        ''')
        por_usuario = rows_to_dicts(cur)
    return render_template('dashboard.html', total_paginas=total_paginas, total_usuarios=total_usuarios, total_categorias=total_categorias, por_categoria=por_categoria, por_usuario=por_usuario, ultimos=ultimos)


@app.route('/jerarquia')
def taxonomia_admin():
    """Reemplaza la antigua página de Jerarquía por la nueva administración de taxonomía.

    El usuario sigue entrando desde el mismo menú/ruta: /jerarquia.
    Las rutas /taxonomia se conservan solo como compatibilidad interna/redirección.
    """
    if not require_login():
        return redirect(url_for('login'))
    editar_id = request.args.get('editar', type=int)
    contexto = obtener_taxonomia_contexto(editar_id)
    return render_template('taxonomia_admin.html', **contexto)


# ─────────────────────────────────────────────────────────────
# ACTUALIZACIÓN: Administración y explorador de taxonomía
# Adaptado desde el módulo SENTINEL9J para Flask + SQL Server.
# No usa PHP ni MySQL; trabaja sobre dbo.categorias y dbo.fuentes.
# ─────────────────────────────────────────────────────────────

def _ultimo_segmento_codigo(codigo):
    partes = str(codigo or '').split('.')
    try:
        return int(partes[-1])
    except Exception:
        return 0


def sugerir_codigo_taxonomia(cur, nivel, padre_id=None, excluir_id=None):
    """Genera el siguiente código disponible para la jerarquía.

    Reglas:
    - Nivel 1: toma el último código raíz numérico y suma 1. Ej. 10 -> 11.
    - Nivel 2: toma el código del padre y el último hijo directo. Ej. 1.7 -> 1.8.
    - Nivel 3: toma el código del padre y el último tipo directo. Ej. 1.4.8 -> 1.4.9.

    El cálculo se hace en backend para que no dependa del valor enviado por el navegador.
    """
    nivel = int(nivel)
    excluir_id = int(excluir_id) if excluir_id else None

    if nivel == 1:
        if excluir_id:
            cur.execute('''
                SELECT codigo
                FROM dbo.categorias
                WHERE nivel = 1
                  AND codigo IS NOT NULL
                  AND id_categoria <> ?
            ''', excluir_id)
        else:
            cur.execute('''
                SELECT codigo
                FROM dbo.categorias
                WHERE nivel = 1
                  AND codigo IS NOT NULL
            ''')
        codigos = [r[0] for r in cur.fetchall()]
        maximo = 0
        for c in codigos:
            try:
                partes = str(c).strip().split('.')
                if len(partes) == 1:
                    maximo = max(maximo, int(partes[0]))
            except Exception:
                pass
        return str(maximo + 1)

    if not padre_id:
        return ''

    padre_id = int(padre_id)
    cur.execute('SELECT codigo FROM dbo.categorias WHERE id_categoria = ?', padre_id)
    row = cur.fetchone()
    if not row or not row[0]:
        return ''
    codigo_padre = str(row[0]).strip()

    if excluir_id:
        cur.execute('''
            SELECT codigo
            FROM dbo.categorias
            WHERE id_padre = ?
              AND nivel = ?
              AND codigo IS NOT NULL
              AND id_categoria <> ?
        ''', padre_id, nivel, excluir_id)
    else:
        cur.execute('''
            SELECT codigo
            FROM dbo.categorias
            WHERE id_padre = ?
              AND nivel = ?
              AND codigo IS NOT NULL
        ''', padre_id, nivel)

    hijos = [r[0] for r in cur.fetchall()]
    maximo = 0
    for c in hijos:
        maximo = max(maximo, _ultimo_segmento_codigo(c))
    return f'{codigo_padre}.{maximo + 1}'


def obtener_codigo_actual(cur, id_categoria):
    cur.execute('''
        SELECT codigo, id_padre, nivel
        FROM dbo.categorias
        WHERE id_categoria = ?
    ''', int(id_categoria))
    row = cur.fetchone()
    if not row:
        return None, None, None
    return row.codigo, row.id_padre, row.nivel


def codigo_existe(cur, codigo, excluir_id=None):
    if excluir_id:
        cur.execute('''
            SELECT TOP 1 id_categoria
            FROM dbo.categorias
            WHERE codigo = ? AND id_categoria <> ?
        ''', codigo, int(excluir_id))
    else:
        cur.execute('''
            SELECT TOP 1 id_categoria
            FROM dbo.categorias
            WHERE codigo = ?
        ''', codigo)
    return cur.fetchone() is not None


def contar_fuentes_por_categoria(cur):
    # Cuenta fuentes activas por categoría incluyendo descendientes.
    cur.execute('''
        WITH arbol AS (
            SELECT id_categoria AS raiz, id_categoria AS hijo
            FROM dbo.categorias
            UNION ALL
            SELECT a.raiz, c.id_categoria
            FROM arbol a
            INNER JOIN dbo.categorias c ON c.id_padre = a.hijo
        )
        SELECT a.raiz AS id_categoria, COUNT(f.id_fuente) AS total_fuentes
        FROM arbol a
        LEFT JOIN dbo.fuentes f
            ON f.id_categoria = a.hijo
           AND f.activo_sistema = 1
        GROUP BY a.raiz
        OPTION (MAXRECURSION 100)
    ''')
    return {row.id_categoria: row.total_fuentes for row in cur.fetchall()}


def obtener_taxonomia_contexto(editar_id=None):
    with get_conn() as conn:
        cur = conn.cursor()
        conteos = contar_fuentes_por_categoria(cur)

        cur.execute('''
            SELECT id_categoria AS id, codigo, nombre_categoria AS nombre,
                   descripcion, palabras_clave, activa, fecha_creacion
            FROM dbo.categorias
            WHERE nivel = 1
            ORDER BY TRY_CONVERT(INT, codigo), nombre_categoria
        ''')
        categorias = rows_to_dicts(cur)

        cur.execute('''
            SELECT s.id_categoria AS id, s.codigo, s.nombre_categoria AS nombre,
                   s.descripcion, s.palabras_clave, s.activa, s.id_padre AS categoria_id,
                   c.nombre_categoria AS categoria_nombre
            FROM dbo.categorias s
            INNER JOIN dbo.categorias c ON c.id_categoria = s.id_padre
            WHERE s.nivel = 2
            ORDER BY s.codigo, s.nombre_categoria
        ''')
        subcategorias = rows_to_dicts(cur)

        cur.execute('''
            SELECT t.id_categoria AS id, t.codigo, t.nombre_categoria AS nombre,
                   t.descripcion, t.palabras_clave, t.activa, t.id_padre AS subcategoria_id,
                   s.nombre_categoria AS subcategoria_nombre,
                   c.id_categoria AS categoria_id,
                   c.nombre_categoria AS categoria_nombre
            FROM dbo.categorias t
            INNER JOIN dbo.categorias s ON s.id_categoria = t.id_padre
            INNER JOIN dbo.categorias c ON c.id_categoria = s.id_padre
            WHERE t.nivel = 3
            ORDER BY c.codigo, s.codigo, t.codigo, t.nombre_categoria
        ''')
        tipos = rows_to_dicts(cur)

        for lista in (categorias, subcategorias, tipos):
            for item in lista:
                item['total_fuentes'] = conteos.get(item['id'], 0)

        editar = None
        if editar_id:
            cur.execute('''
                SELECT id_categoria AS id, codigo, nombre_categoria AS nombre,
                       descripcion, palabras_clave, activa, id_padre, nivel
                FROM dbo.categorias
                WHERE id_categoria = ?
            ''', editar_id)
            editar = row_to_dict(cur)

        sug_cat = sugerir_codigo_taxonomia(cur, 1)
        sug_sub = sugerir_codigo_taxonomia(cur, 2, categorias[0]['id']) if categorias else ''
        sug_tipo = sugerir_codigo_taxonomia(cur, 3, subcategorias[0]['id']) if subcategorias else ''

    return {
        'categorias': categorias,
        'subcategorias': subcategorias,
        'tipos': tipos,
        'editar': editar,
        'sug_cat': sug_cat,
        'sug_sub': sug_sub,
        'sug_tipo': sug_tipo,
        'metricas_taxonomia': {
            'categorias': len(categorias),
            'subcategorias': len(subcategorias),
            'tipos': len(tipos),
            'total_elementos': len(categorias) + len(subcategorias) + len(tipos)
        }
    }


@app.route('/taxonomia')
def taxonomia_redirect():
    # Compatibilidad: si alguien conserva el enlace viejo, se manda a Jerarquía.
    return redirect(url_for('taxonomia_admin'))


@app.route('/jerarquia/explorador')
def taxonomia_explorador():
    if not require_login():
        return redirect(url_for('login'))
    return render_template('taxonomia_explorador.html')


@app.route('/taxonomia/explorador')
def taxonomia_explorador_redirect():
    return redirect(url_for('taxonomia_explorador'))


@app.route('/jerarquia/guardar', methods=['POST'])
@app.route('/taxonomia/guardar', methods=['POST'])
def taxonomia_guardar():
    if not require_login():
        return redirect(url_for('login'))

    id_categoria = request.form.get('id_categoria', '').strip()
    nivel = int(request.form.get('nivel', '1'))
    nombre = request.form.get('nombre', '').strip()
    descripcion = request.form.get('descripcion', '').strip() or None
    palabras_clave = request.form.get('palabras_clave', '').strip() or None
    id_padre = request.form.get('id_padre', '').strip()
    id_padre = int(id_padre) if id_padre else None

    if not nombre:
        flash('El nombre es obligatorio.', 'error')
        return redirect(url_for('taxonomia_admin'))

    if nivel in (2, 3) and not id_padre:
        flash('Selecciona la categoría padre correspondiente.', 'error')
        return redirect(url_for('taxonomia_admin'))

    try:
        with get_conn() as conn:
            cur = conn.cursor()

            if id_categoria:
                # En edición se conserva el código actual si el nivel y el padre no cambian.
                # Si el usuario mueve el elemento a otro padre, se recalcula automáticamente.
                codigo_actual, padre_actual, nivel_actual = obtener_codigo_actual(cur, int(id_categoria))
                if int(nivel_actual) == int(nivel) and (padre_actual or None) == (id_padre or None):
                    codigo = codigo_actual
                else:
                    codigo = sugerir_codigo_taxonomia(cur, nivel, id_padre, excluir_id=int(id_categoria))
            else:
                # En altas, el backend SIEMPRE calcula el siguiente código.
                # No se confía en el valor enviado desde el formulario para evitar duplicados.
                codigo = sugerir_codigo_taxonomia(cur, nivel, id_padre)

            if not codigo:
                flash('No se pudo generar el código automático. Revisa el padre seleccionado.', 'error')
                return redirect(url_for('taxonomia_admin'))

            if codigo_existe(cur, codigo, excluir_id=int(id_categoria) if id_categoria else None):
                flash(f'No se pudo guardar: el código automático {codigo} ya existe. Actualiza la página e intenta de nuevo.', 'error')
                return redirect(url_for('taxonomia_admin'))

            if id_categoria:
                cur.execute('''
                    UPDATE dbo.categorias
                    SET nombre_categoria = ?, codigo = ?, descripcion = ?, palabras_clave = ?, id_padre = ?
                    WHERE id_categoria = ? AND nivel = ?
                ''', nombre, codigo, descripcion, palabras_clave, id_padre, int(id_categoria), nivel)
                flash(f'Elemento actualizado correctamente. Código asignado: {codigo}', 'success')
            else:
                cur.execute('''
                    INSERT INTO dbo.categorias (nombre_categoria, descripcion, palabras_clave, id_padre, nivel, codigo, activa)
                    VALUES (?, ?, ?, ?, ?, ?, 1)
                ''', nombre, descripcion, palabras_clave, id_padre, nivel, codigo)
                flash(f'Elemento creado correctamente. Código asignado: {codigo}', 'success')
            conn.commit()
    except Exception as e:
        flash('No se pudo guardar el elemento: ' + str(e), 'error')

    return redirect(url_for('taxonomia_admin'))


@app.route('/jerarquia/toggle/<int:id_categoria>')
@app.route('/taxonomia/toggle/<int:id_categoria>')
def taxonomia_toggle(id_categoria):
    if not require_login():
        return redirect(url_for('login'))
    try:
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute('''
                UPDATE dbo.categorias
                SET activa = CASE WHEN activa = 1 THEN 0 ELSE 1 END
                WHERE id_categoria = ?
            ''', id_categoria)
            conn.commit()
        flash('Estado actualizado correctamente.', 'success')
    except Exception as e:
        flash('No se pudo cambiar el estado: ' + str(e), 'error')
    return redirect(url_for('taxonomia_admin'))


@app.route('/jerarquia/eliminar/<int:id_categoria>')
@app.route('/taxonomia/eliminar/<int:id_categoria>')
def taxonomia_eliminar(id_categoria):
    if not require_login():
        return redirect(url_for('login'))
    try:
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute('SELECT COUNT(*) AS total FROM dbo.categorias WHERE id_padre = ?', id_categoria)
            hijos = row_to_dict(cur)['total']
            cur.execute('SELECT COUNT(*) AS total FROM dbo.fuentes WHERE id_categoria = ? AND activo_sistema = 1', id_categoria)
            fuentes = row_to_dict(cur)['total']
            if hijos or fuentes:
                cur.execute('UPDATE dbo.categorias SET activa = 0 WHERE id_categoria = ?', id_categoria)
                conn.commit()
                flash('El elemento tiene dependencias, por seguridad fue desactivado en lugar de eliminarse.', 'success')
            else:
                cur.execute('DELETE FROM dbo.categorias WHERE id_categoria = ?', id_categoria)
                conn.commit()
                flash('Elemento eliminado correctamente.', 'success')
    except Exception as e:
        flash('No se pudo eliminar/desactivar el elemento: ' + str(e), 'error')
    return redirect(url_for('taxonomia_admin'))


@app.route('/api/taxonomia/metricas')
def api_taxonomia_metricas():
    if not require_login():
        return jsonify({'error': 'No autorizado'}), 401
    contexto = obtener_taxonomia_contexto()
    return jsonify(contexto['metricas_taxonomia'])


@app.route('/api/taxonomia/sugerir_codigo')
def api_taxonomia_sugerir_codigo():
    if not require_login():
        return jsonify({'success': False, 'error': 'No autorizado'}), 401
    nivel = request.args.get('nivel', type=int)
    padre_id = request.args.get('padre_id', type=int)
    excluir_id = request.args.get('excluir_id', type=int)
    if not nivel:
        return jsonify({'success': False, 'error': 'Nivel inválido'}), 400
    with get_conn() as conn:
        cur = conn.cursor()
        codigo = sugerir_codigo_taxonomia(cur, nivel, padre_id, excluir_id=excluir_id)
    return jsonify({'success': True, 'codigoSugerido': codigo})


@app.route('/api/taxonomia/datos')
def api_taxonomia_datos():
    if not require_login():
        return jsonify({'error': 'No autorizado'}), 401
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute('''
            SELECT id_categoria, nombre_categoria, codigo, descripcion, palabras_clave, id_padre, nivel, activa
            FROM dbo.categorias
            WHERE activa = 1
            ORDER BY nivel, codigo, nombre_categoria
        ''')
        categorias = rows_to_dicts(cur)
        cur.execute('''
            SELECT id_categoria, COUNT(*) AS total
            FROM dbo.fuentes
            WHERE activo_sistema = 1
            GROUP BY id_categoria
        ''')
        directos = {row.id_categoria: row.total for row in cur.fetchall()}

    nodos = {}
    for c in categorias:
        nodos[c['id_categoria']] = {
            'id': c['id_categoria'],
            'name': f"{c.get('codigo') or ''} {c['nombre_categoria']}".strip(),
            'nombre': c['nombre_categoria'],
            'codigo': c.get('codigo'),
            'nivel': c['nivel'],
            'descripcion': c.get('descripcion') or '',
            'palabras_clave': c.get('palabras_clave') or '',
            'total_fuentes_directas': directos.get(c['id_categoria'], 0),
            'total_fuentes': directos.get(c['id_categoria'], 0),
            'children': []
        }

    raiz = {'name': 'Categorías SENTINEL', 'children': []}
    for c in categorias:
        nodo = nodos[c['id_categoria']]
        padre = c.get('id_padre')
        if padre and padre in nodos:
            nodos[padre]['children'].append(nodo)
        else:
            raiz['children'].append(nodo)

    def acumular(nodo):
        total = nodo.get('total_fuentes_directas', 0)
        for hijo in nodo.get('children', []):
            total += acumular(hijo)
        nodo['total_fuentes'] = total
        return total

    for hijo in raiz['children']:
        acumular(hijo)
    return jsonify(raiz)


@app.route('/api/taxonomia/busqueda')
def api_taxonomia_busqueda():
    if not require_login():
        return jsonify({'error': 'No autorizado'}), 401
    q = request.args.get('q', '').strip()
    if not q:
        return jsonify({'categorias': [], 'fuentes': []})
    patron = f'%{q}%'
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute('''
            SELECT TOP 20 id_categoria AS id, codigo, nombre_categoria AS nombre, nivel
            FROM dbo.categorias
            WHERE activa = 1 AND (nombre_categoria LIKE ? OR codigo LIKE ? OR descripcion LIKE ?)
            ORDER BY nivel, codigo, nombre_categoria
        ''', patron, patron, patron)
        cats = rows_to_dicts(cur)
        cur.execute('''
            SELECT TOP 20 id_fuente AS id, sitio, url_facebook, categoria_raiz, subcategoria, tipo_especifico, municipio, estado
            FROM dbo.vw_fuentes_detalle
            WHERE activo_sistema = 1 AND (sitio LIKE ? OR url_facebook LIKE ? OR categoria_raiz LIKE ? OR subcategoria LIKE ? OR tipo_especifico LIKE ? OR municipio LIKE ?)
            ORDER BY sitio
        ''', patron, patron, patron, patron, patron, patron)
        fuentes = rows_to_dicts(cur)
    return jsonify({'categorias': cats, 'fuentes': fuentes})


@app.route('/api/taxonomia/paginas_tipo/<int:id_categoria>')
def api_taxonomia_paginas_tipo(id_categoria):
    if not require_login():
        return jsonify({'error': 'No autorizado'}), 401
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute('''
            SELECT sitio, url_web, url_facebook, municipio, estado, pais, tipo_fuente, observaciones
            FROM dbo.vw_fuentes_detalle
            WHERE activo_sistema = 1 AND id_categoria = ?
            ORDER BY sitio
        ''', id_categoria)
        paginas = rows_to_dicts(cur)
    return jsonify(paginas)



# ─────────────────────────────────────────────────────────────
# ACTUALIZACIÓN: Buscador web de Facebook sin login
# Busca páginas y publicaciones públicas de Facebook mediante Google Custom Search API.
# No depende de iniciar sesión en Facebook ni de Playwright.
# ─────────────────────────────────────────────────────────────

DEFAULT_SCRAPING_TERMS = [
    'balacera', 'accidente', 'inundacion', 'choque', 'incendio', 'volcadura',
    'bloqueo', 'cierre vial', 'desaparecido', 'detenido', 'robo', 'asalto',
    'homicidio', 'fuga de gas', 'manifestacion'
]


def split_terms(raw):
    raw = (raw or '').strip()
    if not raw:
        return DEFAULT_SCRAPING_TERMS[:]
    partes = []
    for line in raw.replace(';', ',').split('\n'):
        partes.extend(x.strip() for x in line.split(','))
    return [x for x in partes if x]


def google_cse_config():
    """Devuelve credenciales de Google Custom Search desde variables de entorno o config.py."""
    api_key = (
        app.config.get('GOOGLE_CSE_API_KEY')
        or app.config.get('GOOGLE_API_KEY')
        or os.environ.get('GOOGLE_CSE_API_KEY')
        or os.environ.get('GOOGLE_API_KEY')
        or ''
    ).strip()
    cx = (
        app.config.get('GOOGLE_CSE_ID')
        or app.config.get('GOOGLE_SEARCH_ENGINE_ID')
        or os.environ.get('GOOGLE_CSE_ID')
        or os.environ.get('GOOGLE_SEARCH_ENGINE_ID')
        or ''
    ).strip()
    return api_key, cx


def google_cse_disponible():
    api_key, cx = google_cse_config()
    return bool(api_key and cx)


def limpiar_facebook_url_generica(url):
    """Normaliza URLs de Facebook y devuelve una posible URL de página/fuente."""
    if not url:
        return None
    url = str(url).strip()
    if 'l.facebook.com/l.php' in url:
        try:
            qs = parse_qs(urlparse(url).query or '')
            if qs.get('u'):
                url = qs['u'][0]
        except Exception:
            pass
    try:
        parsed = urlparse(url)
    except Exception:
        return None
    host = (parsed.netloc or '').lower().replace('www.', '')
    if host not in ('facebook.com', 'm.facebook.com', 'web.facebook.com'):
        return None
    path = parsed.path or ''
    if not path or path == '/':
        return None
    segments = [seg for seg in path.split('/') if seg]
    if not segments:
        return None
    first = segments[0]
    qs = parse_qs(parsed.query or '')

    # Casos de perfiles numéricos o historias/permalinks que traen id de página/persona.
    if first in ('profile.php', 'story.php', 'permalink.php') and qs.get('id'):
        return 'https://www.facebook.com/profile.php?id=' + qs['id'][0]

    invalid_first = {
        'login', 'search', 'watch', 'share', 'sharer.php', 'stories', 'story.php',
        'permalink.php', 'photo.php', 'photos', 'events', 'groups', 'reel', 'reels',
        'videos', 'posts', 'gaming', 'marketplace', 'help', 'notifications', 'hashtag',
        'people', 'pages', 'privacy', 'policies'
    }
    if first in invalid_first:
        return None
    return 'https://www.facebook.com/' + first.strip('/')


def limpiar_post_link(url):
    if not url:
        return ''
    try:
        parsed = urlparse(str(url).strip())
    except Exception:
        return ''
    if 'facebook.com' not in (parsed.netloc or '').lower():
        return ''
    marcas = ['/posts/', '/videos/', '/reel/', 'permalink.php', 'story.php', 'story_fbid']
    full = parsed.geturl()
    return full if any(m in full for m in marcas) else ''


def nombre_desde_url_fuente(url, fallback='Fuente detectada'):
    if not url:
        return str(fallback or 'Fuente detectada')[:180]
    try:
        parsed = urlparse(url)
        if parsed.path.startswith('/profile.php'):
            ident = parse_qs(parsed.query).get('id', [''])[0]
            return f'Facebook profile {ident}'[:180] if ident else str(fallback)[:180]
        slug = [seg for seg in parsed.path.split('/') if seg]
        if slug:
            return slug[0].replace('-', ' ').replace('.', ' ').replace('_', ' ').title()[:180]
    except Exception:
        pass
    return str(fallback or 'Fuente detectada')[:180]


def recortar(texto, max_len=4000):
    texto = ' '.join(str(texto or '').split())
    return texto[:max_len]


def tipo_resultado_desde_url(url):
    post = limpiar_post_link(url)
    if post:
        return 'post'
    return 'pagina'


def google_cse_buscar(query, paginas=1, max_items=10):
    """Busca resultados públicos de Facebook en Google Custom Search.

    paginas equivale a páginas de resultados de Google. Cada página trae hasta 10 resultados.
    max_items limita cuántos resultados se devuelven por término.
    """
    api_key, cx = google_cse_config()
    if not api_key or not cx:
        raise RuntimeError('Faltan GOOGLE_CSE_API_KEY y GOOGLE_CSE_ID. Configúralas en el servicio sentinel antes de buscar.')

    resultados = []
    vistos = set()
    paginas = max(1, min(int(paginas or 1), 5))
    max_items = max(1, min(int(max_items or 10), 50))

    for page_num in range(paginas):
        if len(resultados) >= max_items:
            break
        start_index = 1 + (page_num * 10)
        params = {
            'key': api_key,
            'cx': cx,
            'q': f'site:facebook.com {query}',
            'num': 10,
            'start': start_index,
            'safe': 'off',
            'lr': 'lang_es',
        }
        resp = requests.get('https://www.googleapis.com/customsearch/v1', params=params, timeout=20)
        if resp.status_code != 200:
            try:
                detalle = resp.json().get('error', {}).get('message', resp.text[:300])
            except Exception:
                detalle = resp.text[:300]
            raise RuntimeError(f'Google Custom Search respondió {resp.status_code}: {detalle}')

        data = resp.json()
        items = data.get('items') or []
        if not items:
            break

        for item in items:
            if len(resultados) >= max_items:
                break
            link = item.get('link') or ''
            if 'facebook.com' not in link:
                continue
            titulo = recortar(item.get('title') or '', 250)
            snippet = recortar(item.get('snippet') or '', 1200)
            url_fuente = limpiar_facebook_url_generica(link)
            enlace = limpiar_post_link(link) or link
            key = url_fuente or enlace or (titulo + snippet)
            if not key or key in vistos:
                continue
            vistos.add(key)
            resultados.append({
                'tipo_resultado': tipo_resultado_desde_url(link),
                'busqueda': query,
                'texto': recortar(f'{titulo}. {snippet}', 2500),
                'enlace': enlace,
                'url_fuente': url_fuente or '',
                'nombre_fuente': nombre_desde_url_fuente(url_fuente, titulo or 'Fuente detectada'),
                'links_detectados': [link],
                'capturado_en': datetime.utcnow().isoformat()
            })
    return resultados


def crear_scraping_job(terminos, ubicacion, scrolls, max_posts, creado_por):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO dbo.scraping_jobs (terminos, ubicacion, scrolls, max_posts, estado, creado_por, fecha_inicio)
            OUTPUT INSERTED.id_job
            VALUES (?, ?, ?, ?, 'pendiente', ?, SYSDATETIME())
        """, json.dumps(terminos, ensure_ascii=False), ubicacion, int(scrolls), int(max_posts), creado_por)
        row = cur.fetchone()
        conn.commit()
        return int(row[0])


def actualizar_job(id_job, estado, total=None, error=None):
    with get_conn() as conn:
        cur = conn.cursor()
        if estado in ('finalizado', 'error'):
            cur.execute("""
                UPDATE dbo.scraping_jobs
                SET estado=?, total_resultados=ISNULL(?, total_resultados), mensaje_error=?, fecha_fin=SYSDATETIME()
                WHERE id_job=?
            """, estado, total, error, id_job)
        else:
            cur.execute('UPDATE dbo.scraping_jobs SET estado=?, mensaje_error=? WHERE id_job=?', estado, error, id_job)
        conn.commit()


def insertar_resultados_job(id_job, resultados):
    if not resultados:
        return 0
    insertados = 0
    vistos = set()
    with get_conn() as conn:
        cur = conn.cursor()
        for r in resultados:
            key = r.get('enlace') or r.get('url_fuente') or r.get('texto', '')[:250]
            if not key or key in vistos:
                continue
            vistos.add(key)
            cur.execute("""
                INSERT INTO dbo.scraping_resultados
                    (id_job, tipo_resultado, busqueda, texto, enlace, url_fuente, nombre_fuente, links_detectados, capturado_en)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, id_job, r.get('tipo_resultado'), r.get('busqueda'), recortar(r.get('texto'), 3900),
                 r.get('enlace') or '', r.get('url_fuente') or '', r.get('nombre_fuente') or '',
                 json.dumps(r.get('links_detectados') or [], ensure_ascii=False), r.get('capturado_en'))
            insertados += 1
        conn.commit()
    return insertados


def ejecutar_scraping_background(id_job, terms, location, scrolls, max_posts):
    with app.app_context():
        try:
            actualizar_job(id_job, 'ejecutando')
            all_results = []
            seen = set()
            for term in terms:
                query = f'{term} {location}'.strip()
                try:
                    encontrados = google_cse_buscar(query, paginas=scrolls, max_items=max_posts)
                    for item in encontrados:
                        k = item.get('url_fuente') or item.get('enlace') or item.get('texto', '')[:200]
                        if k and k not in seen:
                            seen.add(k)
                            all_results.append(item)
                except Exception as term_exc:
                    all_results.append({
                        'tipo_resultado': 'error',
                        'busqueda': query,
                        'texto': f'Error buscando {query}: {term_exc}',
                        'enlace': '', 'url_fuente': '', 'nombre_fuente': '',
                        'links_detectados': [],
                        'capturado_en': datetime.utcnow().isoformat()
                    })
            total = insertar_resultados_job(id_job, all_results)
            actualizar_job(id_job, 'finalizado', total=total)
        except Exception as exc:
            actualizar_job(id_job, 'error', total=0, error=str(exc))


def get_scraping_job(id_job):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute('SELECT * FROM dbo.scraping_jobs WHERE id_job=?', id_job)
        job = row_to_dict(cur)
        cur.execute("""
            SELECT id_resultado, tipo_resultado, busqueda, texto, enlace, url_fuente,
                   nombre_fuente, links_detectados, capturado_en, fuente_agregada_id
            FROM dbo.scraping_resultados
            WHERE id_job=?
            ORDER BY id_resultado DESC
        """, id_job)
        resultados = rows_to_dicts(cur)
    return job, resultados


def categorias_para_select():
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT id_categoria AS id,
                   CONCAT(COALESCE(codigo, ''), CASE WHEN codigo IS NULL OR codigo='' THEN '' ELSE ' - ' END, nombre_categoria) AS nombre,
                   nivel
            FROM dbo.categorias
            WHERE activa=1
            ORDER BY nivel, codigo, nombre_categoria
        """)
        return rows_to_dicts(cur)


@app.route('/buscador', methods=['GET', 'POST'])
def buscador_scraping():
    if not require_login():
        return redirect(url_for('login'))
    search_api_configured = google_cse_disponible()
    if request.method == 'POST':
        terms = split_terms(request.form.get('terminos'))
        ubicacion = request.form.get('ubicacion', 'Querétaro').strip() or 'Querétaro'
        scrolls = max(1, min(int(request.form.get('scrolls', 1)), 5))
        max_posts = max(1, min(int(request.form.get('max_posts', 10)), 50))
        id_job = crear_scraping_job(terms, ubicacion, scrolls, max_posts, session.get('usuario', 'Sistema'))
        hilo = threading.Thread(target=ejecutar_scraping_background, args=(id_job, terms, ubicacion, scrolls, max_posts), daemon=True)
        hilo.start()
        flash(f'Búsqueda web iniciada. Job #{id_job}.', 'success')
        return redirect(url_for('buscador_job', id_job=id_job))

    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT TOP 10 id_job, terminos, ubicacion, estado, total_resultados, mensaje_error, fecha_inicio, fecha_fin
            FROM dbo.scraping_jobs
            ORDER BY id_job DESC
        """)
        jobs = rows_to_dicts(cur)
    return render_template('buscador_scraping.html', jobs=jobs, default_terms='\n'.join(DEFAULT_SCRAPING_TERMS), search_api_configured=search_api_configured, search_provider='Google Custom Search')


@app.route('/buscador/job/<int:id_job>')
def buscador_job(id_job):
    if not require_login():
        return redirect(url_for('login'))
    job, resultados = get_scraping_job(id_job)
    if not job:
        flash('No se encontró la búsqueda solicitada.', 'error')
        return redirect(url_for('buscador_scraping'))
    categorias = categorias_para_select()
    return render_template('buscador_scraping.html', job=job, resultados=resultados, categorias=categorias, default_terms='\n'.join(DEFAULT_SCRAPING_TERMS), search_api_configured=google_cse_disponible(), search_provider='Google Custom Search')


@app.route('/buscador/agregar_fuente/<int:id_resultado>', methods=['POST'])
def buscador_agregar_fuente(id_resultado):
    if not require_login():
        return redirect(url_for('login'))
    categoria_id = request.form.get('categoria_id')
    nombre = request.form.get('nombre', '').strip()
    municipio = request.form.get('municipio', '').strip() or None
    estado_ubi = request.form.get('estado', 'Querétaro').strip() or 'Querétaro'
    pais = request.form.get('pais', 'México').strip() or 'México'
    tipo_fuente = request.form.get('tipo_fuente', 'Pendiente').strip() or 'Pendiente'
    try:
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute('SELECT * FROM dbo.scraping_resultados WHERE id_resultado=?', id_resultado)
            r = row_to_dict(cur)
            if not r:
                flash('No se encontró el resultado.', 'error')
                return redirect(url_for('buscador_scraping'))
            url_fb = (request.form.get('url_facebook') or r.get('url_fuente') or r.get('enlace') or '').strip()
            if not url_fb:
                flash('El resultado no tiene URL de fuente para registrar.', 'error')
                return redirect(url_for('buscador_job', id_job=r['id_job']))
            nombre = nombre or r.get('nombre_fuente') or nombre_desde_url_fuente(url_fb)
            duplicados = buscar_posible_duplicado(cur, nombre, url_fb, None)
            if duplicados:
                flash('⚠ No se agregó porque ya existe: ' + ' | '.join(duplicados), 'error')
                return redirect(url_for('buscador_job', id_job=r['id_job']))
            if not categoria_id:
                flash('Selecciona una categoría para agregar la fuente.', 'error')
                return redirect(url_for('buscador_job', id_job=r['id_job']))
            obs = f'Agregada desde Buscador web. Resultado #{id_resultado}. Búsqueda: {r.get("busqueda")}'
            cur.execute("""
                EXEC dbo.spCrearFuente
                    @sitio=?, @url_web=?, @url_facebook=?, @tipo_fuente=?, @id_categoria=?,
                    @municipio=?, @estado=?, @pais=?, @enlace_valido=?, @pagina_activa=?,
                    @duplicado=?, @estado_validacion=?, @observaciones=?, @agregado_por=?
            """, nombre, None, url_fb, tipo_fuente, int(categoria_id), municipio, estado_ubi, pais,
                 'Sí', 'Sí', 'No', 'Pendiente', obs, session.get('usuario', 'Sistema'))
            cur.execute('SELECT TOP 1 id_fuente FROM dbo.fuentes WHERE url_facebook=? ORDER BY id_fuente DESC', url_fb)
            nueva = cur.fetchone()
            if nueva:
                cur.execute('UPDATE dbo.scraping_resultados SET fuente_agregada_id=? WHERE id_resultado=?', nueva[0], id_resultado)
            conn.commit()
            flash('Fuente agregada correctamente desde el buscador.', 'success')
            return redirect(url_for('buscador_job', id_job=r['id_job']))
    except Exception as exc:
        flash('No se pudo agregar la fuente: ' + str(exc), 'error')
        return redirect(url_for('buscador_scraping'))


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
