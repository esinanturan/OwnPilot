/**
 * Artifact Routes
 *
 * REST API for managing AI-generated artifacts (HTML, SVG, Markdown, charts, forms)
 * with data bindings and dashboard pinning.
 */

import { Hono } from 'hono';
import type { ArtifactType } from '@ownpilot/core';
import { getArtifactService } from '../services/artifact-service.js';
import {
  getUserId,
  apiResponse,
  apiError,
  ERROR_CODES,
  getErrorMessage,
  getPaginationParams,
  notFoundError,
  sanitizeId,
  validateQueryEnum,
} from './helpers.js';

export const artifactsRoutes = new Hono();

const VALID_TYPES = ['html', 'svg', 'markdown', 'form', 'chart', 'react'] as const;

// =============================================================================
// GET / - List artifacts with filters
// =============================================================================

artifactsRoutes.get('/', async (c) => {
  try {
    const userId = getUserId(c);
    const { limit, offset } = getPaginationParams(c);
    const type = validateQueryEnum(c.req.query('type'), VALID_TYPES) as ArtifactType | undefined;
    const pinned = c.req.query('pinned');
    const conversationId = c.req.query('conversationId');
    const search = c.req.query('search');

    const service = getArtifactService();
    const result = await service.listArtifacts(userId, {
      type,
      pinned: pinned === 'true' ? true : pinned === 'false' ? false : undefined,
      conversationId: conversationId || undefined,
      search: search || undefined,
      limit,
      offset,
    });

    return apiResponse(c, result);
  } catch (err) {
    return apiError(c, { code: ERROR_CODES.INTERNAL_ERROR, message: getErrorMessage(err) }, 500);
  }
});

// =============================================================================
// GET /:id - Get artifact by ID
// =============================================================================

artifactsRoutes.get('/:id', async (c) => {
  try {
    const userId = getUserId(c);
    const id = c.req.param('id');
    const service = getArtifactService();

    const artifact = await service.getArtifact(userId, id);
    if (!artifact) {
      return notFoundError(c, 'Artifact', id);
    }

    return apiResponse(c, artifact);
  } catch (err) {
    return apiError(c, { code: ERROR_CODES.INTERNAL_ERROR, message: getErrorMessage(err) }, 500);
  }
});

// =============================================================================
// POST / - Create artifact
// =============================================================================

artifactsRoutes.post('/', async (c) => {
  try {
    const userId = getUserId(c);
    const body = await c.req.json();

    if (!body.title || !body.type || !body.content) {
      return apiError(
        c,
        { code: ERROR_CODES.VALIDATION_ERROR, message: 'title, type, and content are required' },
        400
      );
    }

    if (!VALID_TYPES.includes(body.type)) {
      return apiError(
        c,
        {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: `Invalid type: ${sanitizeId(body.type)}. Valid: ${VALID_TYPES.join(', ')}`,
        },
        400
      );
    }

    const service = getArtifactService();
    const artifact = await service.createArtifact(userId, {
      conversationId: body.conversationId,
      type: body.type,
      title: body.title,
      content: body.content,
      dataBindings: body.dataBindings,
      pinToDashboard: body.pinToDashboard,
      dashboardSize: body.dashboardSize,
      tags: body.tags,
    });

    return apiResponse(c, artifact, 201);
  } catch (err) {
    return apiError(c, { code: ERROR_CODES.INTERNAL_ERROR, message: getErrorMessage(err) }, 500);
  }
});

// =============================================================================
// PATCH /:id - Update artifact
// =============================================================================

artifactsRoutes.patch('/:id', async (c) => {
  try {
    const userId = getUserId(c);
    const id = c.req.param('id');
    const body = await c.req.json();
    const service = getArtifactService();

    const updated = await service.updateArtifact(userId, id, {
      title: body.title,
      content: body.content,
      dataBindings: body.dataBindings,
      pinned: body.pinned,
      dashboardPosition: body.dashboardPosition,
      dashboardSize: body.dashboardSize,
      tags: body.tags,
    });

    if (!updated) {
      return notFoundError(c, 'Artifact', id);
    }

    return apiResponse(c, updated);
  } catch (err) {
    return apiError(c, { code: ERROR_CODES.INTERNAL_ERROR, message: getErrorMessage(err) }, 500);
  }
});

// =============================================================================
// DELETE /:id - Delete artifact
// =============================================================================

artifactsRoutes.delete('/:id', async (c) => {
  try {
    const userId = getUserId(c);
    const id = c.req.param('id');
    const service = getArtifactService();

    const deleted = await service.deleteArtifact(userId, id);
    if (!deleted) {
      return notFoundError(c, 'Artifact', id);
    }

    return apiResponse(c, { message: 'Artifact deleted' });
  } catch (err) {
    return apiError(c, { code: ERROR_CODES.INTERNAL_ERROR, message: getErrorMessage(err) }, 500);
  }
});

// =============================================================================
// POST /:id/pin - Toggle pin
// =============================================================================

artifactsRoutes.post('/:id/pin', async (c) => {
  try {
    const userId = getUserId(c);
    const id = c.req.param('id');
    const service = getArtifactService();

    const artifact = await service.togglePin(userId, id);
    if (!artifact) {
      return notFoundError(c, 'Artifact', id);
    }

    return apiResponse(c, artifact);
  } catch (err) {
    return apiError(c, { code: ERROR_CODES.INTERNAL_ERROR, message: getErrorMessage(err) }, 500);
  }
});

// =============================================================================
// POST /:id/refresh - Refresh data bindings
// =============================================================================

artifactsRoutes.post('/:id/refresh', async (c) => {
  try {
    const userId = getUserId(c);
    const id = c.req.param('id');
    const service = getArtifactService();

    const artifact = await service.refreshBindings(userId, id);
    if (!artifact) {
      return notFoundError(c, 'Artifact', id);
    }

    return apiResponse(c, artifact);
  } catch (err) {
    return apiError(c, { code: ERROR_CODES.INTERNAL_ERROR, message: getErrorMessage(err) }, 500);
  }
});

// =============================================================================
// GET /:id/versions - Version history
// =============================================================================

artifactsRoutes.get('/:id/versions', async (c) => {
  try {
    const userId = getUserId(c);
    const id = c.req.param('id');
    const service = getArtifactService();

    const versions = await service.getVersions(userId, id);
    return apiResponse(c, versions);
  } catch (err) {
    return apiError(c, { code: ERROR_CODES.INTERNAL_ERROR, message: getErrorMessage(err) }, 500);
  }
});
