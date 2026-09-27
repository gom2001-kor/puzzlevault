"""Create a static upload ZIP without development sources, dependencies, or local data."""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
DIRECTORIES = ('blog', 'css', 'es', 'games', 'images', 'ja', 'js', 'ko', 'lang', 'learn', 'zh')
FILES = ('index.html', 'about.html', 'privacy.html', 'terms.html', 'contact.html', 'favicon.ico', 'favicon.png', 'manifest.json', 'robots.txt', 'sitemap.xml', 'ads.txt', 'sw.js', '_headers', '_redirects')

def package_site():
    if not (ROOT / 'learn/english/index.html').is_file():
        raise SystemExit('Build apps/english before packaging the site.')
    target = (ROOT / 'dist' / 'puzzlevault-public.zip').resolve()
    if target.parent != ROOT / 'dist' or not target.is_relative_to(ROOT):
        raise SystemExit('Output must remain within the project dist directory.')
    target.parent.mkdir(exist_ok=True)
    files = [ROOT / name for name in FILES]
    for folder in DIRECTORIES:
        files.extend(path for path in (ROOT / folder).rglob('*') if path.is_file() and path.name != '_template.html')
    with ZipFile(target, 'w', ZIP_DEFLATED, compresslevel=7) as archive:
        for file in sorted(files):
            if file.is_symlink() or not file.resolve().is_relative_to(ROOT):
                raise SystemExit('Refusing an asset outside this project: ' + str(file))
            archive.write(file, file.relative_to(ROOT).as_posix())
    print(str(target))
    print(str(len(files)) + ' public assets; ' + str(target.stat().st_size) + ' bytes')
    print('Static upload only. Existing functions/_middleware.js remains in the repository for CLI deployments.')

if __name__ == '__main__':
    package_site()
