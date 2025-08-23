const Joi = require('joi');

module.exports.fillSchema=Joi.object({
    name:Joi.string().required(),
    purpose:Joi.string().required(),
    adhaar:Joi.string().required(),
    idCardPic: Joi.string().uri(),
    phone:Joi.number().required(),
    compID:Joi.number().required(),
    compName:Joi.string().required(),
    vehicleType:Joi.string().allow("",null),
    vehicleNumber:Joi.string().allow("",null),
}).required();