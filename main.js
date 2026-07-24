console.log("EXTENSION: bm-extra loaded!")


//Extension should fire/refresh on page change
main(window.location.href) //Initial page load
window.addEventListener("load", () => main(window.location.href))
navigation.addEventListener("navigate", async (event) => {
    main(event.destination.url);
});

//React is done with building the DOM
window.addEventListener("__REACT_HYDRATED__", () => { main(window.location.href) });
//Extension should fire/refresh on page change

async function main(urlString) {
    const { router } = await import(browser.runtime.getURL('./modules/page/router.js'));

    const url = new URL(urlString);
    router(url);
}