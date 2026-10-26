const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Adaptive Health Tracker API',
    version: '1.0.0',
    description: 'Activity intake, adaptive meal plans, and health-platform synchronization.',
  },
  servers: [{ url: '/', description: 'Current server' }],
  tags: [
    { name: 'Activity', description: 'Meal and activity data' },
    { name: 'Adaptation', description: 'Adaptive next-day meal plans' },
    { name: 'Health sync', description: 'Apple HealthKit and Health Connect webhooks' },
  ],
  paths: {
    '/api/activity-log': {
      patch: {
        tags: ['Activity'],
        summary: 'Update logged meal intake',
        operationId: 'updateActivityLog',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ActivityLogUpdate' },
              example: {
                userId: '123e4567-e89b-12d3-a456-426614174000',
                date: '2026-10-26',
                actualCaloriesConsumed: 1980,
                completedSlots: ['breakfast', 'lunch', 'dinner'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Intake updated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ActivityLogUpdateResponse' } } },
          },
          '422': { $ref: '#/components/responses/InvalidPayload' },
          '500': { $ref: '#/components/responses/ServerError' },
        },
      },
    },
    '/api/adapt-plan': {
      post: {
        tags: ['Adaptation'],
        summary: 'Compute an adapted next-day meal plan',
        operationId: 'computeNextDayPlan',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ComputeNextDayPlanInput' },
              example: {
                currentPlan: {
                  planId: 'plan_2026-10-26_user',
                  userId: '123e4567-e89b-12d3-a456-426614174000',
                  date: '2026-10-26',
                  targetCalories: 2000,
                  targetProteinGrams: 150,
                  targetCarbsGrams: 200,
                  targetFatGrams: 67,
                  expectedBurnKcal: 400,
                  meals: [],
                },
                actualLog: {
                  logId: '223e4567-e89b-12d3-a456-426614174000',
                  userId: '123e4567-e89b-12d3-a456-426614174000',
                  date: '2026-10-26',
                  stepsLogged: 7500,
                  sedentaryHours: 7,
                  activeWorkouts: [],
                  totalBurnKcal: 380,
                  actualCaloriesConsumed: 1950,
                },
                user: {
                  userId: '123e4567-e89b-12d3-a456-426614174000',
                  sex: 'male',
                  weightKg: 85,
                  occupationType: 'desk_sedentary',
                },
                nextDayDate: '2026-10-27',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Adapted meal plan and feedback',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AdaptPlanResponse' } } },
          },
          '400': { description: 'Malformed JSON payload' },
          '422': { $ref: '#/components/responses/InvalidPayload' },
          '500': { $ref: '#/components/responses/ServerError' },
        },
      },
    },
    '/api/webhooks/health-sync': {
      post: {
        tags: ['Health sync'],
        summary: 'Receive activity data from a health platform',
        operationId: 'syncHealthData',
        parameters: [
          {
            name: 'x-health-signature',
            in: 'header',
            required: false,
            description: 'Required in production: lowercase hex HMAC-SHA256 of the raw request body, using HEALTH_SYNC_WEBHOOK_SECRET.',
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/HealthSyncWebhookInput' },
              examples: {
                appleHealthKit: {
                  summary: 'Apple HealthKit payload',
                  value: {
                    provider: 'apple_healthkit',
                    userId: '123e4567-e89b-12d3-a456-426614174000',
                    date: '2026-10-26',
                    stepCount: 7500,
                    activeEnergyBurnedKcal: 380,
                    sedentaryHours: 7,
                    workouts: [],
                  },
                },
                healthConnect: {
                  summary: 'Health Connect payload',
                  value: {
                    provider: 'health_connect',
                    userId: '123e4567-e89b-12d3-a456-426614174000',
                    date: '2026-10-26',
                    steps: 7500,
                    totalCaloriesBurned: 380,
                    sedentaryDurationHours: 7,
                    sessions: [],
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Health data normalized to an activity record',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthSyncResponse' } } },
          },
          '400': { description: 'Malformed JSON payload' },
          '401': { description: 'Invalid webhook signature in production' },
          '422': { $ref: '#/components/responses/InvalidPayload' },
          '500': { $ref: '#/components/responses/ServerError' },
        },
      },
    },
  },
  components: {
    responses: {
      InvalidPayload: {
        description: 'Request payload failed validation',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['error', 'issues'],
              properties: {
                error: { type: 'string' },
                issues: { type: 'object', additionalProperties: true },
              },
            },
          },
        },
      },
      ServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
    schemas: {
      IsoDate: { type: 'string', format: 'date', example: '2026-10-26' },
      UserId: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
      ActivityLogUpdate: {
        type: 'object',
        required: ['userId', 'date', 'actualCaloriesConsumed', 'completedSlots'],
        properties: {
          userId: { $ref: '#/components/schemas/UserId' },
          date: { $ref: '#/components/schemas/IsoDate' },
          actualCaloriesConsumed: { type: 'number', minimum: 0, maximum: 10000 },
          completedSlots: {
            type: 'array',
            items: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
          },
        },
      },
      ActivityLogUpdateResponse: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              userId: { $ref: '#/components/schemas/UserId' },
              date: { $ref: '#/components/schemas/IsoDate' },
              actualCaloriesConsumed: { type: 'number' },
              completedSlots: { type: 'array', items: { type: 'string' } },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      ComputeNextDayPlanInput: {
        type: 'object',
        required: ['currentPlan', 'actualLog', 'user', 'nextDayDate'],
        properties: {
          currentPlan: { $ref: '#/components/schemas/DailyMealPlan' },
          actualLog: { $ref: '#/components/schemas/DailyActivityLog' },
          user: { $ref: '#/components/schemas/AdaptationUser' },
          nextDayDate: { $ref: '#/components/schemas/IsoDate' },
        },
      },
      DailyMealPlan: {
        type: 'object',
        required: ['planId', 'userId', 'date', 'targetCalories', 'targetProteinGrams', 'targetCarbsGrams', 'targetFatGrams', 'expectedBurnKcal', 'meals'],
        properties: {
          planId: { type: 'string', minLength: 1 },
          userId: { $ref: '#/components/schemas/UserId' },
          date: { $ref: '#/components/schemas/IsoDate' },
          targetCalories: { type: 'integer', minimum: 1000 },
          targetProteinGrams: { type: 'number', minimum: 40 },
          targetCarbsGrams: { type: 'number', minimum: 0 },
          targetFatGrams: { type: 'number', minimum: 15 },
          expectedBurnKcal: { type: 'number', minimum: 0 },
          meals: { type: 'array', items: { $ref: '#/components/schemas/MealSlot' } },
        },
      },
      MealSlot: {
        type: 'object',
        required: ['slot', 'suggestedItems', 'calories', 'macros', 'isDeskJobOptimized'],
        properties: {
          slot: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
          suggestedItems: { type: 'array', minItems: 1, items: { type: 'string', minLength: 1 } },
          calories: { type: 'integer', minimum: 0 },
          macros: {
            type: 'object',
            required: ['protein', 'carbs', 'fat'],
            properties: {
              protein: { type: 'number', minimum: 0 },
              carbs: { type: 'number', minimum: 0 },
              fat: { type: 'number', minimum: 0 },
            },
          },
          isDeskJobOptimized: { type: 'boolean' },
        },
      },
      DailyActivityLog: {
        type: 'object',
        required: ['logId', 'userId', 'date', 'stepsLogged', 'sedentaryHours', 'totalBurnKcal', 'actualCaloriesConsumed'],
        properties: {
          logId: { type: 'string', format: 'uuid' },
          userId: { $ref: '#/components/schemas/UserId' },
          date: { $ref: '#/components/schemas/IsoDate' },
          stepsLogged: { type: 'integer', minimum: 0, maximum: 100000 },
          sedentaryHours: { type: 'number', minimum: 0, maximum: 24 },
          activeWorkouts: { type: 'array', items: { $ref: '#/components/schemas/ActiveWorkout' }, default: [] },
          totalBurnKcal: { type: 'number', minimum: 0, maximum: 6000 },
          actualCaloriesConsumed: { type: 'number', minimum: 0, maximum: 10000 },
        },
      },
      ActiveWorkout: {
        type: 'object',
        required: ['type', 'durationMinutes', 'estimatedBurnKcal'],
        properties: {
          type: { type: 'string', enum: ['walking', 'running', 'resistance_training', 'cycling', 'other'] },
          durationMinutes: { type: 'integer', minimum: 1, maximum: 360 },
          estimatedBurnKcal: { type: 'number', minimum: 0, maximum: 3000 },
        },
      },
      AdaptationUser: {
        type: 'object',
        required: ['userId', 'sex', 'weightKg', 'occupationType'],
        properties: {
          userId: { $ref: '#/components/schemas/UserId' },
          sex: { type: 'string', enum: ['male', 'female'] },
          weightKg: { type: 'number', minimum: 35, maximum: 300 },
          occupationType: { type: 'string', enum: ['desk_sedentary', 'standing', 'active_labor'] },
        },
      },
      AdaptPlanResponse: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            required: ['plan', 'feedback'],
            properties: {
              plan: { $ref: '#/components/schemas/DailyMealPlan' },
              feedback: {
                type: 'object',
                properties: {
                  appliedRules: { type: 'array', items: { type: 'string', enum: ['MISSED_ACTIVITY', 'WORKOUT_SURPLUS', 'SEVERE_UNDEREATING', 'ON_TRACK'] } },
                  warnings: { type: 'array', items: { type: 'string' } },
                  actionablePrompts: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      },
      HealthSyncWebhookInput: {
        oneOf: [
          { $ref: '#/components/schemas/AppleHealthKitPayload' },
          { $ref: '#/components/schemas/HealthConnectPayload' },
        ],
        discriminator: { propertyName: 'provider' },
      },
      AppleHealthKitPayload: {
        type: 'object',
        required: ['provider', 'userId', 'date', 'stepCount', 'activeEnergyBurnedKcal'],
        properties: {
          provider: { type: 'string', enum: ['apple_healthkit'] },
          userId: { $ref: '#/components/schemas/UserId' },
          date: { $ref: '#/components/schemas/IsoDate' },
          stepCount: { type: 'integer', minimum: 0, maximum: 100000 },
          activeEnergyBurnedKcal: { type: 'number', minimum: 0, maximum: 10000 },
          sedentaryHours: { type: 'number', minimum: 0, maximum: 24, default: 8 },
          workouts: { type: 'array', items: { $ref: '#/components/schemas/AppleWorkout' }, default: [] },
        },
      },
      AppleWorkout: {
        type: 'object',
        required: ['uuid', 'workoutActivityType', 'duration', 'startDate', 'endDate'],
        properties: {
          uuid: { type: 'string' },
          workoutActivityType: { type: 'string' },
          duration: { type: 'number', minimum: 0, description: 'Duration in seconds' },
          totalEnergyBurned: { type: 'number', minimum: 0 },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
        },
      },
      HealthConnectPayload: {
        type: 'object',
        required: ['provider', 'userId', 'date', 'steps', 'totalCaloriesBurned'],
        properties: {
          provider: { type: 'string', enum: ['health_connect'] },
          userId: { $ref: '#/components/schemas/UserId' },
          date: { $ref: '#/components/schemas/IsoDate' },
          steps: { type: 'integer', minimum: 0, maximum: 100000 },
          totalCaloriesBurned: { type: 'number', minimum: 0, maximum: 10000 },
          sedentaryDurationHours: { type: 'number', minimum: 0, maximum: 24, default: 8 },
          sessions: { type: 'array', items: { $ref: '#/components/schemas/HealthConnectSession' }, default: [] },
        },
      },
      HealthConnectSession: {
        type: 'object',
        required: ['id', 'exerciseType', 'startTime', 'endTime'],
        properties: {
          id: { type: 'string' },
          exerciseType: { type: 'string' },
          startTime: { type: 'string', format: 'date-time' },
          endTime: { type: 'string', format: 'date-time' },
          durationMinutes: { type: 'number', minimum: 0 },
          caloriesBurned: { type: 'number', minimum: 0 },
        },
      },
      HealthSyncResponse: {
        type: 'object',
        required: ['success', 'message', 'record'],
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          record: {
            type: 'object',
            properties: {
              userId: { $ref: '#/components/schemas/UserId' },
              date: { $ref: '#/components/schemas/IsoDate' },
              stepsLogged: { type: 'integer' },
              sedentaryHours: { type: 'number' },
              activeWorkouts: { type: 'array', items: { $ref: '#/components/schemas/ActiveWorkout' } },
              totalBurnKcal: { type: 'integer' },
            },
          },
        },
      },
    },
  },
} as const;

export default openApiSpec;