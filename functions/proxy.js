const fetch = require('node-fetch');
const zlib = require('zlib');
const { promisify } = require('util');

// Gunakan promisify untuk mendekompresi GZIP
const gunzip = promisify(zlib.gunzip);

exports.handler = async (event, context) => {
    // Ambil ID dari path URL
    const id = event.path.replace(/^\//, ''); // Hapus slash awal
    if (!id) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'ID is required' }),
        };
    }

    try {
        // URL sumber data
        const sourceUrl = `https://awokwok.netlify.app/${id}.json.gz`;

        // Ambil data dari URL sumber
        const response = await fetch(sourceUrl);
        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: 'Failed to fetch data' }),
            };
        }

        // Baca data sebagai array buffer
        const arrayBuffer = await response.arrayBuffer();

        // Dekompresi data GZIP
        const decompressedData = await gunzip(Buffer.from(arrayBuffer));

        // Parsing data JSON
        const jsonData = JSON.parse(decompressedData.toString('utf-8'));

        // Kirim data JSON sebagai respons
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(jsonData, null, 2),
        };
    } catch (error) {
        console.error('Error fetching or decompressing data:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};