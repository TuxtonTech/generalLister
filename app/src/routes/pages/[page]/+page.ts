import type { PageLoad } from './$types';

export const load = (async ({ params, fetch, url }) => {
    console.log(await params);
    const searchTerm = url.searchParams.get('s');
    // const res = await fetch('https://www.google.com/')
    // const text = await res.text()
    return {
        title: params.page,
        searchTerm,
    };
}) satisfies PageLoad;