const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Helper function to generate random usage units (1-5)
function generateRandomUsageUnits() {
    return Math.floor(Math.random() * 5) + 1;
}

// Helper function to generate random fake price (10-100)
function generateRandomResult() {
    return parseFloat((Math.random() * 90 + 10).toFixed(2));
}

// POST /jobs - Create a new job
router.post('/', async (req, res) => {
    try {
        const { clientId, name, targetUrls } = req.body;

        // Validate input
        if (!clientId || !name || !targetUrls || !Array.isArray(targetUrls) || targetUrls.length === 0) {
            return res.status(400).json({
                error: 'clientId, name, and targetUrls (array) are required'
            });
        }

        // Check if client exists
        const client = await prisma.client.findUnique({
            where: { id: clientId }
        });

        if (!client) {
            return res.status(404).json({
                error: 'Client not found'
            });
        }

        // Create job
        const job = await prisma.job.create({
            data: {
                clientId,
                name,
                targetUrls
            }
        });

        res.status(201).json(job);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to create job',
            message: error.message
        });
    }
});

// POST /jobs/:jobId/run - Execute a job run
router.post('/:jobId/run', async (req, res) => {
    try {
        const jobId = parseInt(req.params.jobId);

        // Get job
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: { client: true }
        });

        if (!job) {
            return res.status(404).json({
                error: 'Job not found'
            });
        }

        // Get billing rates from environment
        const clientRate = parseFloat(process.env.CLIENT_RATE_PER_UNIT || 10);
        const partnerRate = parseFloat(process.env.PARTNER_RATE_PER_UNIT || 6);

        // Create job run with PENDING status
        const jobRun = await prisma.jobRun.create({
            data: {
                jobId,
                status: 'PENDING'
            }
        });

        // Update status to RUNNING
        await prisma.jobRun.update({
            where: { id: jobRun.id },
            data: {
                status: 'RUNNING',
                startedAt: new Date()
            }
        });

        try {
            // Process each target URL
            const urlResults = [];
            let totalUsageUnits = 0;

            for (const url of job.targetUrls) {
                const usageUnits = generateRandomUsageUnits();
                const result = generateRandomResult();

                totalUsageUnits += usageUnits;

                // Create URL result
                const urlResult = await prisma.urlResult.create({
                    data: {
                        jobRunId: jobRun.id,
                        url,
                        usageUnits,
                        result
                    }
                });

                urlResults.push(urlResult);
            }

            // Calculate billing
            const clientCharge = totalUsageUnits * clientRate;
            const partnerPayout = totalUsageUnits * partnerRate;
            const platformShare = clientCharge - partnerPayout;

            // Update job run with SUCCESS status and billing data
            const updatedJobRun = await prisma.jobRun.update({
                where: { id: jobRun.id },
                data: {
                    status: 'SUCCESS',
                    totalUsageUnits,
                    clientCharge,
                    partnerPayout,
                    platformShare,
                    completedAt: new Date()
                },
                include: {
                    urlResults: true
                }
            });

            res.status(200).json(updatedJobRun);
        } catch (error) {
            // Update job run with FAILED status
            await prisma.jobRun.update({
                where: { id: jobRun.id },
                data: {
                    status: 'FAILED',
                    completedAt: new Date()
                }
            });

            throw error;
        }
    } catch (error) {
        res.status(500).json({
            error: 'Failed to run job',
            message: error.message
        });
    }
});

// GET /jobs/:jobId/runs - Get job run history
router.get('/:jobId/runs', async (req, res) => {
    try {
        const jobId = parseInt(req.params.jobId);

        // Check if job exists
        const job = await prisma.job.findUnique({
            where: { id: jobId }
        });

        if (!job) {
            return res.status(404).json({
                error: 'Job not found'
            });
        }

        // Get all runs for the job
        const runs = await prisma.jobRun.findMany({
            where: { jobId },
            include: {
                urlResults: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json({
            jobId,
            jobName: job.name,
            totalRuns: runs.length,
            runs: runs.map(run => ({
                id: run.id,
                status: run.status,
                totalUsageUnits: run.totalUsageUnits,
                clientCharge: run.clientCharge,
                partnerPayout: run.partnerPayout,
                platformShare: run.platformShare,
                createdAt: run.createdAt,
                startedAt: run.startedAt,
                completedAt: run.completedAt,
                urlResults: run.urlResults
            }))
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch job runs',
            message: error.message
        });
    }
});

module.exports = router;
