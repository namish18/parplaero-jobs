const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// POST /clients - Create a new client
router.post('/', async (req, res) => {
    try {
        const { name, email } = req.body;

        // Validate input
        if (!name || !email) {
            return res.status(400).json({
                error: 'Name and email are required'
            });
        }

        // Create client
        const client = await prisma.client.create({
            data: { name, email }
        });

        res.status(201).json(client);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({
                error: 'Email already exists'
            });
        }
        res.status(500).json({
            error: 'Failed to create client',
            message: error.message
        });
    }
});

// GET /clients/:clientId/summary - Get client billing summary
router.get('/:clientId/summary', async (req, res) => {
    try {
        const clientId = parseInt(req.params.clientId);

        // Get client with all jobs and runs
        const client = await prisma.client.findUnique({
            where: { id: clientId },
            include: {
                jobs: {
                    include: {
                        runs: {
                            include: {
                                urlResults: true
                            }
                        }
                    }
                }
            }
        });

        if (!client) {
            return res.status(404).json({
                error: 'Client not found'
            });
        }

        // Calculate totals
        let totalUsageUnits = 0;
        let totalClientCharges = 0;
        let totalPartnerPayouts = 0;
        let totalPlatformShare = 0;

        client.jobs.forEach(job => {
            job.runs.forEach(run => {
                totalUsageUnits += run.totalUsageUnits;
                totalClientCharges += run.clientCharge;
                totalPartnerPayouts += run.partnerPayout;
                totalPlatformShare += run.platformShare;
            });
        });

        res.json({
            client: {
                id: client.id,
                name: client.name,
                email: client.email,
                createdAt: client.createdAt
            },
            jobs: client.jobs.map(job => ({
                id: job.id,
                name: job.name,
                targetUrls: job.targetUrls,
                createdAt: job.createdAt,
                runs: job.runs.map(run => ({
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
            })),
            summary: {
                totalJobs: client.jobs.length,
                totalRuns: client.jobs.reduce((sum, job) => sum + job.runs.length, 0),
                totalUsageUnits,
                totalClientCharges: parseFloat(totalClientCharges.toFixed(2)),
                totalPartnerPayouts: parseFloat(totalPartnerPayouts.toFixed(2)),
                totalPlatformShare: parseFloat(totalPlatformShare.toFixed(2))
            }
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch client summary',
            message: error.message
        });
    }
});

module.exports = router;
