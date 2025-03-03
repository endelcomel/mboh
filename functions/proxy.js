const fetch = require('node-fetch');
const zlib = require('zlib');
const { promisify } = require('util');

// Impor daftar ID dari file terpisah
const idList = require('./idList');

// Gunakan promisify untuk mendekompresi GZIP
const gunzip = promisify(zlib.gunzip);

exports.handler = async (event, context) => {
    try {
        // Parse path atau query string
        const path = event.path.replace(/^\//, '');
        const [route, query] = path.split('?');

        if (route.startsWith("random=")) {
            const count = parseInt(route.split("=")[1], 10); // Ambil jumlah data yang diminta
            if (isNaN(count) || count <= 0) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: "Invalid count value" }),
                };
            }

            // Pilih ID secara acak
            const selectedIds = getRandomIds(idList, count);

            // Fetch data untuk setiap ID
            const results = await Promise.all(
                selectedIds.map(async (id) => {
                    try {
                        const sourceUrl = `https://awokwok.netlify.app/${id}.json.gz`;
                        const response = await fetch(sourceUrl);
                        if (!response.ok) {
                            throw new Error(`Failed to fetch data for ID: ${id}`);
                        }
                        const arrayBuffer = await response.arrayBuffer();
                        const decompressedData = await gunzip(Buffer.from(arrayBuffer));
                        return JSON.parse(decompressedData.toString('utf-8'));
                    } catch (error) {
                        console.error(`Error fetching data for ID ${id}:`, error.message);
                        return null; // Skip ID yang gagal
                    }
                })
            );

            // Filter hasil yang berhasil
            const validResults = results.filter(result => result !== null);

            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify(validResults, null, 2),
            };
        }

        // Handle route lain (misalnya /{id})
        const id = route;
        if (!id) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'ID is required' }),
            };
        }

        const sourceUrl = `https://awokwok.netlify.app/${id}.json.gz`;
        const response = await fetch(sourceUrl);
        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: 'Failed to fetch data' }),
            };
        }

        const arrayBuffer = await response.arrayBuffer();
        const decompressedData = await gunzip(Buffer.from(arrayBuffer));
        const jsonData = JSON.parse(decompressedData.toString('utf-8'));

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(jsonData, null, 2),
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};

// Fungsi untuk memilih ID secara acak
function getRandomIds(list, count) {
    const shuffled = list.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}
