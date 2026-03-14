"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crmController_1 = require("../controllers/crmController");
const router = express_1.default.Router();
router.get('/', crmController_1.getCRMItems);
router.post('/', crmController_1.createCRMItem);
router.put('/order', crmController_1.updateCRMItemOrder); // Need to define this before /:id so it doesn't match id
router.put('/:id', crmController_1.updateCRMItem);
router.delete('/:id', crmController_1.deleteCRMItem);
exports.default = router;
