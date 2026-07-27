from flask import Flask, render_template, request, redirect, url_for, flash, session
from flask_mysqldb import MySQL
from config import Config
import bcrypt

app = Flask(__name__)
app.config.from_object(Config)

mysql = MySQL(app)

@app.route('/')
def inicio():
    if 'usuario' not in session:
        return redirect(url_for('login'))

    busqueda = request.args.get('q', '')
    cur = mysql.connection.cursor()

    if busqueda:
        cur.execute("""
            SELECT p.id, p.nombre, p.url_facebook, p.url_web,
                   p.municipio, p.estado, p.tipo_fuente,
                   p.enlace_valido, p.pagina_activa, p.duplicado,
                   p.estado_validacion,
                   p.categoria_raiz, p.subcategoria, p.tipo_especifico,
                   u.nombre AS agregado_por
            FROM paginas p
            JOIN usuarios u ON p.agregado_por = u.id
            WHERE p.nombre LIKE %s OR p.categoria_raiz LIKE %s
            OR p.municipio LIKE %s OR p.tipo_fuente LIKE %s
            ORDER BY p.nombre
        """, (f'%{busqueda}%', f'%{busqueda}%', f'%{busqueda}%', f'%{busqueda}%'))
    else:
        cur.execute("""
            SELECT p.id, p.nombre, p.url_facebook, p.url_web,
                   p.municipio, p.estado, p.tipo_fuente,
                   p.enlace_valido, p.pagina_activa, p.duplicado,
                   p.estado_validacion,
                   p.categoria_raiz, p.subcategoria, p.tipo_especifico,
                   u.nombre AS agregado_por
            FROM paginas p
            JOIN usuarios u ON p.agregado_por = u.id
            ORDER BY p.nombre
        """)

    paginas = cur.fetchall()
    cur.close()
    return render_template('index.html', paginas=paginas, busqueda=busqueda)


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email    = request.form['email'].strip()
        password = request.form['password'].strip()

        cur = mysql.connection.cursor()
        cur.execute("SELECT * FROM usuarios WHERE email = %s AND activo = 1", (email,))
        usuario = cur.fetchone()
        cur.close()

        print("EMAIL RECIBIDO:", repr(email))
        print("USUARIO ENCONTRADO:", usuario)

        if usuario:
            hash_bd = usuario['password_hash'].encode('utf-8')
            pass_ingresado = password.encode('utf-8')
            resultado = bcrypt.checkpw(pass_ingresado, hash_bd)
            print("CONTRASEÑA CORRECTA:", resultado)
            if resultado:
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
    if 'usuario' not in session:
        return redirect(url_for('login'))

    cur = mysql.connection.cursor()
    cur.execute("SELECT id, nombre, id_padre, nivel FROM categorias WHERE activa = 1 ORDER BY nivel, nombre")
    todas = cur.fetchall()
    nivel1 = [c for c in todas if c['nivel'] == 1]
    nivel2 = [c for c in todas if c['nivel'] == 2]
    nivel3 = [c for c in todas if c['nivel'] == 3]

    if request.method == 'POST':
        nombre            = request.form['nombre'].strip()
        url_web           = request.form['url_web'].strip() or None
        url_facebook      = request.form['url_facebook'].strip()
        categoria_id      = request.form.get('cat_final') or None
        municipio         = request.form.get('municipio', '').strip() or None
        estado_ubi        = request.form.get('estado', 'Querétaro').strip()
        pais              = request.form.get('pais', 'México').strip()
        tipo_fuente       = request.form.get('tipo_fuente', '').strip() or None
        enlace_valido     = 1 if request.form.get('enlace_valido') else 0
        pagina_activa     = 1 if request.form.get('pagina_activa') else 0
        duplicado         = 1 if request.form.get('duplicado') else 0
        estado_validacion = request.form.get('estado_validacion', 'pendiente')
        observaciones     = request.form.get('observaciones', '').strip() or None

        # Obtener nombres de categoría para guardar texto
        cat_raiz = cat_sub = cat_tipo = None
        n1_id = request.form.get('sel_n1')
        n2_id = request.form.get('sel_n2')
        n3_id = request.form.get('sel_n3')

        if n1_id:
            cur.execute("SELECT nombre FROM categorias WHERE id = %s", (n1_id,))
            r = cur.fetchone()
            cat_raiz = r['nombre'] if r else None
        if n2_id:
            cur.execute("SELECT nombre FROM categorias WHERE id = %s", (n2_id,))
            r = cur.fetchone()
            cat_sub = r['nombre'] if r else None
        if n3_id:
            cur.execute("SELECT nombre FROM categorias WHERE id = %s", (n3_id,))
            r = cur.fetchone()
            cat_tipo = r['nombre'] if r else None

        if not categoria_id:
            categoria_id = n3_id or n2_id or n1_id

        cur.execute("SELECT id FROM paginas WHERE url_facebook = %s", (url_facebook,))
        existe = cur.fetchone()

        if existe:
            flash('Esa página de Facebook ya está registrada en el sistema.', 'error')
        else:
            cur.execute("""
                INSERT INTO paginas (
                    nombre, url_web, url_facebook, categoria_id, agregado_por,
                    municipio, estado, pais, tipo_fuente,
                    enlace_valido, pagina_activa, duplicado,
                    estado_validacion, observaciones,
                    categoria_raiz, subcategoria, tipo_especifico
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (
                nombre, url_web, url_facebook, categoria_id, session['usuario_id'],
                municipio, estado_ubi, pais, tipo_fuente,
                enlace_valido, pagina_activa, duplicado,
                estado_validacion, observaciones,
                cat_raiz, cat_sub, cat_tipo
            ))
            mysql.connection.commit()
            flash('Página registrada correctamente.', 'success')
            cur.close()
            return redirect(url_for('inicio'))

    cur.close()
    return render_template('agregar.html', nivel1=nivel1, nivel2=nivel2, nivel3=nivel3)


@app.route('/editar/<int:id>', methods=['GET', 'POST'])
def editar(id):
    if 'usuario' not in session:
        return redirect(url_for('login'))

    cur = mysql.connection.cursor()
    cur.execute("SELECT id, nombre, id_padre, nivel FROM categorias WHERE activa = 1 ORDER BY nivel, nombre")
    todas = cur.fetchall()
    nivel1 = [c for c in todas if c['nivel'] == 1]
    nivel2 = [c for c in todas if c['nivel'] == 2]
    nivel3 = [c for c in todas if c['nivel'] == 3]

    if request.method == 'POST':
        nombre            = request.form['nombre'].strip()
        url_web           = request.form['url_web'].strip() or None
        url_facebook      = request.form['url_facebook'].strip()
        categoria_id      = request.form.get('cat_final') or None
        municipio         = request.form.get('municipio', '').strip() or None
        estado_ubi        = request.form.get('estado', 'Querétaro').strip()
        pais              = request.form.get('pais', 'México').strip()
        tipo_fuente       = request.form.get('tipo_fuente', '').strip() or None
        enlace_valido     = 1 if request.form.get('enlace_valido') else 0
        pagina_activa     = 1 if request.form.get('pagina_activa') else 0
        duplicado         = 1 if request.form.get('duplicado') else 0
        estado_validacion = request.form.get('estado_validacion', 'pendiente')
        observaciones     = request.form.get('observaciones', '').strip() or None

        n1_id = request.form.get('sel_n1')
        n2_id = request.form.get('sel_n2')
        n3_id = request.form.get('sel_n3')
        cat_raiz = cat_sub = cat_tipo = None

        if n1_id:
            cur.execute("SELECT nombre FROM categorias WHERE id = %s", (n1_id,))
            r = cur.fetchone(); cat_raiz = r['nombre'] if r else None
        if n2_id:
            cur.execute("SELECT nombre FROM categorias WHERE id = %s", (n2_id,))
            r = cur.fetchone(); cat_sub = r['nombre'] if r else None
        if n3_id:
            cur.execute("SELECT nombre FROM categorias WHERE id = %s", (n3_id,))
            r = cur.fetchone(); cat_tipo = r['nombre'] if r else None

        if not categoria_id:
            categoria_id = n3_id or n2_id or n1_id

        cur.execute("SELECT id FROM paginas WHERE url_facebook = %s AND id != %s", (url_facebook, id))
        existe = cur.fetchone()

        if existe:
            flash('Esa URL de Facebook ya está registrada en otro registro.', 'error')
        else:
            cur.execute("""
                UPDATE paginas SET
                    nombre=%s, url_web=%s, url_facebook=%s, categoria_id=%s,
                    municipio=%s, estado=%s, pais=%s, tipo_fuente=%s,
                    enlace_valido=%s, pagina_activa=%s, duplicado=%s,
                    estado_validacion=%s, observaciones=%s,
                    categoria_raiz=%s, subcategoria=%s, tipo_especifico=%s
                WHERE id=%s
            """, (
                nombre, url_web, url_facebook, categoria_id,
                municipio, estado_ubi, pais, tipo_fuente,
                enlace_valido, pagina_activa, duplicado,
                estado_validacion, observaciones,
                cat_raiz, cat_sub, cat_tipo, id
            ))
            mysql.connection.commit()
            flash('Página actualizada correctamente.', 'success')
            cur.close()
            return redirect(url_for('inicio'))

    cur.execute("SELECT * FROM paginas WHERE id = %s", (id,))
    pagina = cur.fetchone()
    cur.close()
    return render_template('editar.html', pagina=pagina, nivel1=nivel1, nivel2=nivel2, nivel3=nivel3)


@app.route('/eliminar/<int:id>')
def eliminar(id):
    if 'usuario' not in session:
        return redirect(url_for('login'))

    cur = mysql.connection.cursor()
    cur.execute("DELETE FROM paginas WHERE id = %s", (id,))
    mysql.connection.commit()
    cur.close()
    flash('Página eliminada correctamente.', 'success')
    return redirect(url_for('inicio'))

@app.route('/arquitectura')
def arquitectura():
    if 'usuario' not in session:
        return redirect(url_for('login'))
    return render_template('arquitectura.html')
import csv
import io
from flask import Response

@app.route('/exportar')
def exportar():
    if 'usuario' not in session:
        return redirect(url_for('login'))

    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT p.nombre, p.url_web, p.url_facebook, 
               c.nombre AS categoria, u.nombre AS agregado_por,
               p.creado_en
        FROM paginas p
        JOIN categorias c ON p.categoria_id = c.id
        JOIN usuarios u ON p.agregado_por = u.id
        ORDER BY c.nombre, p.nombre
    """)
    paginas = cur.fetchall()
    cur.close()

    # Crear el CSV en memoria
    output = io.StringIO()
    writer = csv.writer(output)

    # Encabezados
    writer.writerow(['Nombre', 'Sitio Web', 'URL Facebook', 
                     'Categoría', 'Agregado por', 'Fecha de registro'])

    # Datos
    for p in paginas:
        writer.writerow([
            p['nombre'],
            p['url_web'] or 'N/A',
            p['url_facebook'],
            p['categoria'],
            p['agregado_por'],
            p['creado_en'].strftime('%d/%m/%Y %H:%M') if p['creado_en'] else ''
        ])

    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=SENTINEL_paginas.csv'}
    )
@app.route('/dashboard')
def dashboard():
    if 'usuario' not in session:
        return redirect(url_for('login'))

    cur = mysql.connection.cursor()

    # Totales
    cur.execute("SELECT COUNT(*) AS total FROM paginas")
    total_paginas = cur.fetchone()['total']

    cur.execute("SELECT COUNT(*) AS total FROM usuarios WHERE activo = 1")
    total_usuarios = cur.fetchone()['total']

    cur.execute("SELECT COUNT(*) AS total FROM categorias")
    total_categorias = cur.fetchone()['total']

    # Páginas por categoría
    cur.execute("""
        SELECT c.nombre, COUNT(p.id) AS total
        FROM categorias c
        LEFT JOIN paginas p ON p.categoria_id = c.id
        GROUP BY c.nombre
        ORDER BY total DESC
    """)
    por_categoria = cur.fetchall()

    # Últimos 8 registros
    cur.execute("""
        SELECT p.nombre, p.url_facebook, c.nombre AS categoria,
               u.nombre AS agregado_por, p.creado_en
        FROM paginas p
        JOIN categorias c ON p.categoria_id = c.id
        JOIN usuarios u ON p.agregado_por = u.id
        ORDER BY p.creado_en DESC
        LIMIT 8
    """)
    ultimos = cur.fetchall()

    # Páginas por usuario
    cur.execute("""
        SELECT u.nombre, COUNT(p.id) AS total
        FROM usuarios u
        LEFT JOIN paginas p ON p.agregado_por = u.id
        GROUP BY u.nombre
        ORDER BY total DESC
    """)
    por_usuario = cur.fetchall()

    cur.close()
    return render_template('dashboard.html',
        total_paginas=total_paginas,
        total_usuarios=total_usuarios,
        total_categorias=total_categorias,
        por_categoria=por_categoria,
        por_usuario=por_usuario,
        ultimos=ultimos
    )
@app.route('/jerarquia')
def jerarquia():
    if 'usuario' not in session:
        return redirect(url_for('login'))

    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT 
            n1.nombre AS categoria_raiz,
            n2.nombre AS subcategoria,
            n3.nombre AS tipo_especifico,
            n3.id     AS codigo
        FROM categorias n1
        LEFT JOIN categorias n2 ON n2.id_padre = n1.id AND n2.nivel = 2 AND n2.activa = 1
        LEFT JOIN categorias n3 ON n3.id_padre = n2.id AND n3.nivel = 3 AND n3.activa = 1
        WHERE n1.nivel = 1 AND n1.activa = 1
        ORDER BY n1.nombre, n2.nombre, n3.nombre
    """)
    datos = cur.fetchall()
    cur.close()
    return render_template('jerarquia.html', datos=datos)
if __name__ == '__main__':
    app.run(debug=True)
    