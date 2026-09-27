const SUPPORTED_LANGUAGES = new Set(['en', 'ko', 'ja', 'zh', 'es']);

export function chooseLanguage(headers) {
    // Match the whole cookie name/value; preview_pv_lang and ko-malformed are not choices.
    const cookie = (headers.get('Cookie') || '').split(';')
        .map(value => value.trim()).find(value => /^pv_lang=(en|ko|ja|zh|es)$/.test(value));
    if (cookie) return cookie.slice('pv_lang='.length);

    return (headers.get('Accept-Language') || '').split(',').map((value, index) => {
        const [tag, ...parameters] = value.trim().split(';');
        const weight = parameters.find(parameter => /^\s*q\s*=/i.test(parameter));
        const quality = weight ? Number(weight.split('=')[1].trim()) : 1;
        const language = tag.toLowerCase().split('-')[0];
        return { language, quality, index };
    }).filter(({ language, quality }) => SUPPORTED_LANGUAGES.has(language) &&
        Number.isFinite(quality) && quality > 0 && quality <= 1)
        .sort((left, right) => right.quality - left.quality || left.index - right.index)[0]?.language || 'en';
}

export async function onRequest(context) {
    const { request, next } = context;
    const url = new URL(request.url);
    // Explicit page URLs, assets, robots.txt and ads.txt are never language redirected.
    if (url.pathname !== '/' || !['GET', 'HEAD'].includes(request.method)) return next();

    const language = chooseLanguage(request.headers);
    let response;
    if (language !== 'en') {
        url.pathname = '/' + language + '/';
        response = new Response(null, { status: 302, headers: { Location: url.href } });
    } else {
        const original = await next();
        response = new Response(original.body, original);
    }
    // A previous visitor's preferred language must not become a shared cached redirect.
    const vary = new Set((response.headers.get('Vary') || '').split(',').map(value => value.trim()).filter(Boolean));
    vary.add('Accept-Language');
    vary.add('Cookie');
    response.headers.set('Vary', [...vary].join(', '));
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
}
