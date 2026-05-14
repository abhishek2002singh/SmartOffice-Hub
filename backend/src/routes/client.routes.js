const router = require('express').Router();
const ctrl   = require('../controllers/client.controller');
const auth   = require('../middleware/auth.middleware');
const { requirePermission, requireRole } = require('../middleware/rbac.middleware');

router.use(auth);

// Service catalog
router.get('/services',        ctrl.listServices);
router.post('/services',       requireRole('SUPERADMIN'), ctrl.createService);
router.patch('/services/:id',  requireRole('SUPERADMIN'), ctrl.updateService);

// Clients
router.get('/',    requirePermission('crm:client:view'),   ctrl.listClients);
router.post('/',   requirePermission('crm:client:create'), ctrl.createClient);
router.get('/:id', requirePermission('crm:client:view'),   ctrl.getClient);
router.patch('/:id', requirePermission('crm:client:edit'), ctrl.updateClient);
router.delete('/:id', requirePermission('crm:client:delete'), ctrl.deleteClient);
router.post('/:id/health', requirePermission('crm:client:edit'), ctrl.refreshHealth);

// Contacts
router.get('/:id/contacts',              requirePermission('crm:client:view'),   ctrl.listContacts);
router.post('/:id/contacts',             requirePermission('crm:client:edit'),   ctrl.addContact);
router.patch('/:id/contacts/:contactId', requirePermission('crm:client:edit'),   ctrl.updateContact);
router.delete('/:id/contacts/:contactId', requirePermission('crm:client:edit'),  ctrl.deleteContact);

// Subscriptions
router.get('/:id/subscriptions',          requirePermission('crm:subscription:view'), ctrl.listSubscriptions);
router.post('/:id/subscriptions',         requirePermission('crm:subscription:edit'), ctrl.addSubscription);
router.patch('/:id/subscriptions/:subId', requirePermission('crm:subscription:edit'), ctrl.updateSubscription);

// Tickets
router.get('/:id/tickets',               requirePermission('crm:ticket:view'), ctrl.listTickets);
router.post('/:id/tickets',              requirePermission('crm:ticket:edit'), ctrl.addTicket);
router.patch('/:id/tickets/:ticketId',   requirePermission('crm:ticket:edit'), ctrl.updateTicket);

module.exports = router;
