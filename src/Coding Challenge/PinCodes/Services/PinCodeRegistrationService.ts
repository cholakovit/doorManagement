import { Injectable } from "@nestjs/common";
import { PinCodeRegistration } from "../Model/PinCodeRegistration";
import { DoorService } from "../../Doors/Services/DoorService";
import { LogEnabled } from "../../../Boilerplate/Logging/LogEnabled";
import { PinCodeRegistrationRepository } from "../Repositories/PinCodeRegistrationRepository";
import { CacheResult, ClearCache } from "src/helper/decorators";

@Injectable()
export class PinCodeRegistrationService extends LogEnabled {
  constructor(
    private pinCodeRegistrationRepository: PinCodeRegistrationRepository,
    private doorService: DoorService
  ) {
    super();
  }

  /**
   * Gets all current registrations with caching.
   */
  @CacheResult(120, 'user-registrations')
  async getRegistrations() {
    // nothing to do here - just a little helper for you during testing
    return this.pinCodeRegistrationRepository.findAll();
  }

  /**
   * Registers a new pinCode registration and updates the whitelists
   * of the authorized devices accordingly.
   */
  async registerPinCodeAuthorizations(
    userId: string,
    registration: {
      pinCode: string;
      doorIds: string[];
      restrictions?: AccessRestrictions[];
    }
  ) {
    await this.validateDoors(registration.doorIds);

    const pinRegistration: PinCodeRegistration = {
      pinCode: registration.pinCode,
      doorIds: registration.doorIds,
      restrictions: registration.restrictions || [],
    };

    await this.pinCodeRegistrationRepository.savePinCodeRegistration({
      ...pinRegistration,
      userId,
    } as PinCodeRegistration);

    this.logger.info(
      `PIN code ${registration.pinCode} registered successfully for user: ${userId}`
    );

    //return await this.doorService.getDoors();
    return {
      message: `PIN code ${registration.pinCode} registered successfully.`,
    };
  }

  private async validateDoors(doorIds: string[]) {
    const availableDoors = await this.doorService.getDoors();
    const invalidDoors = doorIds.filter(
      (doorIds) => !availableDoors.some((door) => door.id === doorIds)
    );
    if (invalidDoors.length > 0) {
      throw new Error(`Doors ${invalidDoors.join(", ")} are not available`);
    }
  }

  /**
   * Updates an existing pinCode registration and updates the whitelists
   * of the authorized devices accordingly.
   */
  async updatePinCodeAuthorizations(
    userId: string,
    registration: PinCodeRegistration
  ) {
    const existingRegistration =
      await this.pinCodeRegistrationRepository.getRegistration(
        userId,
        registration.pinCode
      );
    if (!existingRegistration) {
      const errorMsg = `No registration found for PIN code: ${registration.pinCode}, user: ${userId}`;
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    await this.validateDoors(registration.doorIds);

    const updatedRegistration = {
      ...existingRegistration,
      doorIds: registration.doorIds,
      restrictions:
        registration.restrictions || existingRegistration.restrictions,
    };

    await this.pinCodeRegistrationRepository.savePinCodeRegistration(
      updatedRegistration
    );

    this.logger.info(
      `PIN code ${registration.pinCode} updated successfully for user: ${userId}`
    );
    //return await this.doorService.getDoors();
    return { message: "PIN code updated successfully." };
  }

  /**
   * Revokes the user's registration for the specified pin code.
   */
  async revokePinCodeAuthorizations(userId: string, pinCode: string) {
    const existingRegistration =
      await this.pinCodeRegistrationRepository.getRegistration(userId, pinCode);
    if (!existingRegistration) {
      throw new Error(
        `No registration found for PIN code: ${pinCode}, user: ${userId}`
      );
    }

    await this.pinCodeRegistrationRepository.deletePicCodeRegistration(
      userId,
      pinCode
    );
    ClearCache('user-registrations');

    this.logger.info(
      `PIN code ${pinCode} revoked successfully for user: ${userId}`
    );
    //return await this.doorService.getDoors();
    return { message: "PIN code deleted successfully." };
  }

  async validateAccess(
    userId: string,
    pinCode: string,
    doorId: string,
    date: Date
  ): Promise<boolean> {
    const registration =
      await this.pinCodeRegistrationRepository.getRegistration(userId, pinCode);
    if (!registration) {
      return false;
    }

    if (!registration.doorIds.includes(doorId)) {
      return false;
    }

    if (registration.restrictions) {
      for (const restriction of registration.restrictions) {
        const { validFrom, validTo } = restriction;
        if (
          (validFrom && date < new Date(validFrom)) ||
          (validTo && date > new Date(validTo))
        ) {
          return false;
        }
      }
    }

    return true;
  }

  async getAllRegistrationsForUser(
    userId: string
  ): Promise<PinCodeRegistration[]> {
    return await this.pinCodeRegistrationRepository.getUserRegistrations(
      userId
    );
  }

  async isPinCodeRegistered(userId: string, pinCode: string): Promise<boolean> {
    const registration =
      await this.pinCodeRegistrationRepository.getRegistration(userId, pinCode);
    return !!registration;
  }
}