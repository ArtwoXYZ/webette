Bun.serve({
    port: 3456,
    fetch(req) {
        const url = new URL(req.url);
        let path = url.pathname === "/" ? "/index.html" : url.pathname;
        return new Response(Bun.file(`${import.meta.dir}${path}`));
    },
});
console.log("Serving appTheme on http://localhost:3456");
