import argparse
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
    parser = argparse.ArgumentParser(description='Genera facebook_session.json para el buscador scraping de SENTINEL.')
    parser.add_argument('--output', default='facebook_session.json')
    args = parser.parse_args()
    output = Path(args.output)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=80)
        context = await browser.new_context(viewport={'width': 1366, 'height': 900}, locale='es-MX')
        page = await context.new_page()
        await page.goto('https://www.facebook.com/login', wait_until='domcontentloaded')
        print('\nInicia sesión en Facebook en la ventana que se abrió.')
        print('Cuando ya estés dentro de Facebook, regresa aquí y presiona ENTER.\n')
        input()
        await page.goto('https://www.facebook.com/', wait_until='domcontentloaded')
        await page.wait_for_timeout(3000)
        output.parent.mkdir(parents=True, exist_ok=True)
        await context.storage_state(path=str(output))
        await context.close()
        await browser.close()
        print(f'Sesión guardada en: {output.resolve()}')

if __name__ == '__main__':
    asyncio.run(main())
