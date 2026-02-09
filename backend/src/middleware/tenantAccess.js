module.exports = function tenantAccess(req, res, next) {
  const { tenantId } = req.params;
  const { tenantId: userTenantId, role } = req.user;

  // Super admin can access all tenants
  if (role === 'super_admin') return next();

  // Tenant members can access only their tenant
  if (userTenantId === tenantId) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Forbidden: Tenant access denied"
  });
};
