const queue = [];

function requestNextUrl() {
    if (!queue.length) return;
    const { url, resolve } = queue[0];

    return fetch(url)
        .then(res => res.json())
        .then(resolve)
        .then(() => {
            queue.shift();
            if (queue.length) requestNextUrl();
        });
}

function sequentialRequest(url) {
    return new Promise(resolve => {
        queue.push({ url, resolve });
        if (queue.length === 1) requestNextUrl();
    });
}

[
    'https://jsonplaceholder.typicode.com/todos/1',
    'https://jsonplaceholder.typicode.com/todos/2',
    'https://jsonplaceholder.typicode.com/todos/3',
    'https://jsonplaceholder.typicode.com/todos/4',
    'https://jsonplaceholder.typicode.com/todos/5',
    'https://jsonplaceholder.typicode.com/todos/6'
].forEach(url => sequentialRequest(url).then(o => console.log(o)));
