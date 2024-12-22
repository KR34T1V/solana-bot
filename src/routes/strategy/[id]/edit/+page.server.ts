import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/prisma';
import { validateStrategyConfig, validateStrategyName } from '$lib/server/validation';

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.userId) {
    throw redirect(302, '/auth/login');
  }

  const strategy = await prisma.strategy.findUnique({
    where: { id: params.id },
    include: {
      versions: {
        orderBy: { version: 'desc' }
      }
    }
  });

  if (!strategy) {
    throw error(404, 'Strategy not found');
  }

  if (strategy.userId !== locals.userId) {
    throw error(403, 'Not authorized to edit this strategy');
  }

  return {
    strategy,
    strategyTypes: [
      {
        id: 'MEAN_REVERSION',
        name: 'Mean Reversion',
        description: 'Trade based on price deviations from historical averages',
        defaultConfig: {
          timeframe: '1h',
          deviationThreshold: 2,
          lookbackPeriod: 20,
          profitTarget: 1.5,
          stopLoss: 1.0
        }
      },
      {
        id: 'TREND_FOLLOWING',
        name: 'Trend Following',
        description: 'Follow market trends using moving averages and momentum',
        defaultConfig: {
          timeframe: '4h',
          fastMA: 9,
          slowMA: 21,
          momentumPeriod: 14,
          profitTarget: 2.0,
          stopLoss: 1.5
        }
      }
    ]
  };
};

export const actions = {
  update: async ({ request, params, locals }) => {
    if (!locals.userId) {
      throw redirect(302, '/auth/login');
    }

    const strategy = await prisma.strategy.findUnique({
      where: { id: params.id }
    });

    if (!strategy) {
      return { success: false, error: 'Strategy not found' };
    }

    if (strategy.userId !== locals.userId) {
      return { success: false, error: 'Not authorized to edit this strategy' };
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    const config = formData.get('config') as string;
    const changes = formData.get('changes') as string;

    if (!name || !type || !config) {
      return { success: false, error: 'Missing required fields' };
    }

    // Validate strategy name
    const nameError = validateStrategyName(name);
    if (nameError) {
      return { success: false, error: nameError.message };
    }

    // Validate strategy configuration
    const validationResult = validateStrategyConfig(type, config);
    if (!validationResult.isValid) {
      return {
        success: false,
        error: validationResult.errors.map(e => `${e.field}: ${e.message}`).join(', ')
      };
    }

    try {
      // Create a new version
      const newVersion = strategy.currentVersion + 1;
      
      // Start a transaction to update both strategy and create version
      const updatedStrategy = await prisma.$transaction(async (tx) => {
        // Create new version
        await tx.strategyVersion.create({
          data: {
            version: newVersion,
            name,
            type,
            config,
            changes: changes || `Updated strategy configuration (v${newVersion})`,
            strategyId: strategy.id
          }
        });

        // Update strategy
        return tx.strategy.update({
          where: { id: params.id },
          data: {
            name,
            type,
            config,
            currentVersion: newVersion
          }
        });
      });

      return { success: true, strategy: updatedStrategy };
    } catch (error) {
      console.error('Strategy update error:', error);
      return { success: false, error: 'Failed to update strategy' };
    }
  },

  revert: async ({ request, params, locals }) => {
    if (!locals.userId) {
      throw redirect(302, '/auth/login');
    }

    const formData = await request.formData();
    const versionId = formData.get('versionId') as string;

    if (!versionId) {
      return { success: false, error: 'Version ID is required' };
    }

    try {
      const version = await prisma.strategyVersion.findUnique({
        where: { id: versionId },
        include: { strategy: true }
      });

      if (!version) {
        return { success: false, error: 'Version not found' };
      }

      if (version.strategy.userId !== locals.userId) {
        return { success: false, error: 'Not authorized to revert this strategy' };
      }

      // Validate strategy name
      const nameError = validateStrategyName(version.name);
      if (nameError) {
        return { success: false, error: nameError.message };
      }

      // Validate strategy configuration
      const validationResult = validateStrategyConfig(version.type, version.config);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: validationResult.errors.map(e => `${e.field}: ${e.message}`).join(', ')
        };
      }

      // Create a new version based on the reverted version
      const newVersion = version.strategy.currentVersion + 1;
      
      const updatedStrategy = await prisma.$transaction(async (tx) => {
        // Create new version
        await tx.strategyVersion.create({
          data: {
            version: newVersion,
            name: version.name,
            type: version.type,
            config: version.config,
            changes: `Reverted to version ${version.version}`,
            strategyId: version.strategyId
          }
        });

        // Update strategy
        return tx.strategy.update({
          where: { id: version.strategyId },
          data: {
            name: version.name,
            type: version.type,
            config: version.config,
            currentVersion: newVersion
          }
        });
      });

      return { success: true, strategy: updatedStrategy };
    } catch (error) {
      console.error('Strategy revert error:', error);
      return { success: false, error: 'Failed to revert strategy' };
    }
  },

  delete: async ({ params, locals }) => {
    if (!locals.userId) {
      throw redirect(302, '/auth/login');
    }

    const strategy = await prisma.strategy.findUnique({
      where: { id: params.id }
    });

    if (!strategy) {
      return { success: false, error: 'Strategy not found' };
    }

    if (strategy.userId !== locals.userId) {
      return { success: false, error: 'Not authorized to delete this strategy' };
    }

    try {
      await prisma.strategy.delete({
        where: { id: params.id }
      });

      throw redirect(302, '/strategy');
    } catch (error) {
      console.error('Strategy deletion error:', error);
      return { success: false, error: 'Failed to delete strategy' };
    }
  }
} satisfies Actions; 