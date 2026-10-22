"""Create a static upload ZIP without development sources, dependencies, or local data."""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
import argparse
import shutil

ROOT = Path(__file__).resolve().parents[1]
DIRECTORIES = ('blog', 'css', 'es', 'games', 'images', 'ja', 'js', 'ko', 'lang', 'learn', 'zh')
FILES = ('index.html', '404.html', 'about.html', 'privacy.html', 'terms.html', 'contact.html', 'favicon.ico', 'favicon.png', 'manifest.json', 'robots.txt', 'sitemap.xml', 'ads.txt', 'sw.js', '_headers', '_redirects')

def package_site(directory=False):
    if not (ROOT / 'learn/english/index.html').is_file():
        raise SystemExit('Build apps/english before packaging the site.')
    target = (ROOT / 'dist' / 'puzzlevault-public.zip').resolve()
    if target.parent != ROOT / 'dist' or not target.is_relative_to(ROOT):
        raise SystemExit('Output must remain within the project dist directory.')
    target.parent.mkdir(exist_ok=True)
    files = [ROOT / name for name in FILES]
    for folder in DIRECTORIES:
        files.extend(path for path in (ROOT / folder).rglob('*') if path.is_file() and path.name != '_template.html')
    if directory:
        output = (ROOT / 'dist' / 'site').resolve()
        if output != ROOT / 'dist' / 'site' or not output.is_relative_to(ROOT) or output.is_symlink():
            raise SystemExit('Refusing unsafe output directory.')
        # This is a dedicated generated directory; remove stale assets before copying.
        if output.exists():
            shutil.rmtree(output)
        output.mkdir()
    with ZipFile(target, 'w', ZIP_DEFLATED, compresslevel=7) as archive:
        for file in sorted(files):
            if file.is_symlink() or not file.resolve().is_relative_to(ROOT):
                raise SystemExit('Refusing an asset outside this project: ' + str(file))
            archive.write(file, file.relative_to(ROOT).as_posix())
            if directory:
                destination = output / file.relative_to(ROOT)
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(file, destination)
    print(str(target))
    print(str(len(files)) + ' public assets; ' + str(target.stat().st_size) + ' bytes')
    print('Static upload only.')
    if directory:
        print('Static deployment directory: ' + str(output))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', action='store_true', help='Also create the clean dist/site deployment directory.')
    package_site(parser.parse_args().directory)
