module.exports = function tenantAccess(req, res, next) {
  const { tenantId } = req.params;
  const { tenant_id, role } = req.user;

  // Super admin can access all tenants
  if (role === 'super_admin') return next();

  // Tenant admin can access only their tenant
  if (role === 'tenant_admin' && tenant_id === tenantId) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Forbidden: Tenant access denied"
  });
};
