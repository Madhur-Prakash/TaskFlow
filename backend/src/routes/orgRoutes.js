const router = require('express').Router();
const orgController = require('../controllers/orgController');
const { protect } = require('../middlewares/auth');
const { requireOrgMember, requireOrgAdmin } = require('../middlewares/orgAccess');
const { validate, schemas } = require('../validators');

router.use(protect);

router.route('/')
  .get(orgController.getMyOrgs)
  .post(validate(schemas.createOrg), orgController.createOrg);

router.route('/:orgId')
  .get(requireOrgMember, orgController.getOrg)
  .delete(requireOrgAdmin, orgController.deleteOrg);

router.post('/:orgId/members', requireOrgAdmin, validate(schemas.addMember), orgController.addMember);
router.delete('/:orgId/members/:userId', requireOrgAdmin, orgController.removeMember);
router.patch('/:orgId/members/:userId/role', requireOrgAdmin, orgController.updateMemberRole);

module.exports = router;
