require('dotenv').config();
const express = require('express');
const cors = require('cors');
const clientsRouter = require('./routes/clients');
const jobsRouter = require('./routes/jobs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/clients', clientsRouter);
app.use('/jobs', jobsRouter);

// Health check
app.get('/', (req, res) => {
    res.json({
        message: 'Jobs + Billing API',
        version: '1.0.0',
        endpoints: {
            clients: [
                'POST /clients',
                'GET /clients/:clientId/summary'
            ],
            jobs: [
                'POST /jobs',
                'POST /jobs/:jobId/run',
                'GET /jobs/:jobId/runs'
            ]
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
