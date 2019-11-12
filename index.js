async function parallelLimit(urls, limit, cb) {
    const results = new Array(urls.length);
    const cache = {};

    async function worker() {
        while (urls.length) {
            const index = urls.length - 1;
            const url = urls.pop();

            if (!cache[url]) {
                cache[url] = fetch(url).then(r => r.json());
            }

            results[index] = await cache[url];
        }
    }

    const workers = [];
    while (limit--) workers.push(worker());
    await Promise.all(workers);

    cb(null, results);
}

parallelLimit(
    [
        'https://jsonplaceholder.typicode.com/todos/1',
        'https://jsonplaceholder.typicode.com/todos/1',
        'https://jsonplaceholder.typicode.com/todos/2',
        'https://jsonplaceholder.typicode.com/todos/3',
        'https://jsonplaceholder.typicode.com/todos/3',
        'https://jsonplaceholder.typicode.com/todos/4'
    ],
    2,
    function done(err, results) {
        console.log(results);
    }
);
