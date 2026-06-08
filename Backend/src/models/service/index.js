const {
	SERVICE_PRICE_SELECT,
	getServiceById,
	getServiceTypeById,
	listServiceTypes,
} = require('./queries');

const {
	getServiceStateByName,
	getPaymentStateByName,
	appendServiceHistory,
	upsertWarrantyForService,
	createPartsForService,
	CONCURRENT_SERVICE_STATES,
	countConcurrentServicesByTechnician,
	syncTechnicianAvailabilityByLoad,
} = require('./helpers');

const {
	createServiceRequest,
	listMyServiceRequests,
	getMyServiceRequestById,
	acceptInitialQuoteByClient,
	rejectInitialQuoteByClient,
} = require('./client');

const {
	getOpenServiceRequests,
	getOpenServiceRequestById,
	acceptServiceRequestByTechnician,
	sendInitialQuoteByTechnician,
	updateAssignedServiceStatusByTechnician,
	listMyAssignedRequests,
	getMyAssignedRequestById,
} = require('./technician');

const {
	listServiceHistory,
	getServiceHistoryById,
	cancelMyServiceRequest,
	markServiceAsPaid,
} = require('./history');

module.exports = {
	getServiceTypeById,
	getServiceStateByName,
	getServiceById,
	createServiceRequest,
	listMyServiceRequests,
	getMyServiceRequestById,
	getOpenServiceRequests,
	getOpenServiceRequestById,
	countConcurrentServicesByTechnician,
	syncTechnicianAvailabilityByLoad,
	acceptServiceRequestByTechnician,
	sendInitialQuoteByTechnician,
	acceptInitialQuoteByClient,
	updateAssignedServiceStatusByTechnician,
	listMyAssignedRequests,
	getMyAssignedRequestById,
	listServiceHistory,
	getServiceHistoryById,
	cancelMyServiceRequest,
	rejectInitialQuoteByClient,
	markServiceAsPaid,
	listServiceTypes,
};
