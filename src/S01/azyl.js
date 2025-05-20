import express from 'express';

const app = express();
const port = 3000;

app.use(express.json());

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

process.on('SIGINT', () => {
    process.exit(0);
});
