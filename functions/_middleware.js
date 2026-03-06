export async function onRequest(context) {
    const { request, next } = context;
    const url = new URL(request.url);

    // Only intercept root (/) requests to avoid redirect loops on localized pages
    if (url.pathname !== '/') {
        return next();
    }

    // 1. Check if user has explicitly chosen a language via cookie
    const cookieHeader = request.headers.get('Cookie') || '';
    const match = cookieHeader.match(/pv_lang=([a-z]{2})/);
    if (match) {
        const lang = match[1];
        if (lang !== 'en' && ['ko', 'ja', 'zh', 'es'].includes(lang)) {
            return Response.redirect(url.origin + '/' + lang + '/', 302);
        }
        // If cookie is 'en', stay on '/'
        return next();
    }

    // 2. Check Accept-Language header if no explicit preference is set
    const acceptLang = request.headers.get('Accept-Language') || '';
    if (acceptLang) {
        // e.g., "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7"
        const langs = acceptLang.split(',').map(l => l.split(';')[0].trim().slice(0, 2).toLowerCase());
        const supportedLangs = ['ko', 'ja', 'zh', 'es', 'en'];

        for (const l of langs) {
            if (supportedLangs.includes(l)) {
                if (l === 'en') {
                    // Stay on root for English
                    return next();
                }
                // Redirect other supported languages
                return Response.redirect(url.origin + '/' + l + '/', 302);
            }
        }
    }

    // Default: return request as-is (English)
    return next();
}
