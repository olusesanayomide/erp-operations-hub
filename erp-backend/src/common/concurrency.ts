import { ConflictException } from '@nestjs/common';

export function assertUnchangedSinceLoaded(
  currentUpdatedAt: Date,
  expectedUpdatedAt?: string,
) {
  if (!expectedUpdatedAt) {
    return;
  }

  const expectedTime = Date.parse(expectedUpdatedAt);

  if (Number.isNaN(expectedTime)) {
    throw new ConflictException(
      'The update could not be checked for conflicts. Refresh and try again.',
    );
  }

  if (currentUpdatedAt.getTime() !== expectedTime) {
    throw new ConflictException(
      'This record changed since you loaded it. Refresh the page and review the latest data before saving.',
    );
  }
}
