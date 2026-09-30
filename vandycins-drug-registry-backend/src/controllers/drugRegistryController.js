const drugRegistryService = require('../services/drugRegistryService');

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.publicMessage = message;
  return error;
}

function requireIdentifier(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw validationError(`${name} is required.`);
  }
  return value.trim();
}

function requireInteger(value, name, minimum = 0) {
  if (value === undefined || value === '') {
    throw validationError(`${name} is required.`);
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum) {
    throw validationError(`${name} must be an integer greater than or equal to ${minimum}.`);
  }
  return parsed;
}

function sendSuccess(res, data) {
  return res.json({ success: true, data });
}

async function searchDrugs(req, res) {
  const q = requireIdentifier(req.query.q, 'q');
  const page = requireInteger(req.query.page, 'page');
  const limit = requireInteger(req.query.limit, 'limit', 1);
  return sendSuccess(res, await drugRegistryService.searchDrugs({ q, page, limit }));
}

async function brandDetails(req, res) {
  return sendSuccess(res, await drugRegistryService.getBrand(requireIdentifier(req.params.brandIdentifier, 'brandIdentifier')));
}

async function genericDetails(req, res) {
  return sendSuccess(res, await drugRegistryService.getGeneric(requireIdentifier(req.params.genericIdentifier, 'genericIdentifier')));
}

async function supplierDetails(req, res) {
  const page = requireInteger(req.query.page, 'page');
  const limit = requireInteger(req.query.limit, 'limit', 1);
  const supplierIdentifier = requireIdentifier(req.params.supplierIdentifier, 'supplierIdentifier');
  return sendSuccess(res, await drugRegistryService.getSupplier(supplierIdentifier, { page, limit }));
}

async function substanceDetails(req, res) {
  return sendSuccess(res, await drugRegistryService.getSubstance(requireIdentifier(req.params.substanceIdentifier, 'substanceIdentifier')));
}

module.exports = {
  searchDrugs,
  brandDetails,
  genericDetails,
  supplierDetails,
  substanceDetails
};
