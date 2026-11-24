const { z } = require('zod');

// Middleware generator that validates request against a Zod schema
function validate(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });
      req.validated = parsed;
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(422).json({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'Request payload validation failed',
          errors: err.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(err);
    }
  };
}

// Validation schemas matching section 5 and 8 of the specification
const incidentCreateSchema = z.object({
  body: z.object({
    incident_name: z.string().min(3, 'Incident name must be at least 3 characters'),
    incident_type: z.string().min(2, 'Incident type is required'),
    status: z.enum(['OPEN', 'ACTIVE', 'UNDER_CONTROL', 'CLOSED', 'MONITORING']).optional().default('OPEN')
  })
});

const zoneCreateSchema = z.object({
  body: z.object({
    incident_id: z.number().int().positive('Valid incident ID is required'),
    zone_name: z.string().min(2, 'Zone name is required'),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().default('MEDIUM')
  })
});

const shelterInventoryUpdateSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Shelter ID must be a numeric integer')
  }),
  body: z.object({
    supply_id: z.number().int().positive('Valid supply ID is required'),
    available_qty: z.number().int().min(0, 'Available quantity cannot be negative')
  })
});

const aidRequestCreateSchema = z.object({
  body: z.object({
    zone_id: z.number().int().positive('Valid zone ID is required'),
    supply_id: z.number().int().positive('Valid supply ID is required'),
    requested_qty: z.number().int().positive('Requested quantity must be greater than 0'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().default('MEDIUM')
  })
});

const dispatchCreateSchema = z.object({
  body: z.object({
    request_id: z.number().int().positive('Valid aid request ID is required'),
    shelter_id: z.number().int().positive('Valid shelter ID is required'),
    dispatch_qty: z.number().int().positive('Dispatch quantity must be greater than 0')
  })
});

const dispatchStatusUpdateSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Dispatch ID must be a numeric integer')
  }),
  body: z.object({
    status: z.enum(['DELIVERED', 'CANCELLED']),
    received_at: z.string().optional()
  })
});

module.exports = {
  validate,
  incidentCreateSchema,
  zoneCreateSchema,
  shelterInventoryUpdateSchema,
  aidRequestCreateSchema,
  dispatchCreateSchema,
  dispatchStatusUpdateSchema
};
