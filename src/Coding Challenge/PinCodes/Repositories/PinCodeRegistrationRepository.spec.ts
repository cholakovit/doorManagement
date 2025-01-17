import { PinCodeRegistrationRepository } from './PinCodeRegistrationRepository'
import { PinCodeRegistrationEntity } from '../Model/PinCodeRegistrationEntity'

describe('', () => {
    let repository: PinCodeRegistrationRepository;

    beforeEach(() => {
        repository = new PinCodeRegistrationRepository()
    })

    it('should create a new PIN code registration', async () => {
        const registration = {
            registeredBy: 'peter',
            pinCode: '1234',
            doorIds: ['garage'],
            restrictions: [],
        }

        await repository.savePinCodeRegistration(registration)

        const result = await repository.getRegistration('peter', '1234')
        expect(result).toEqual(registration)
    })

    it('should update an existing PIN code registration', async () => {
        const registration = {
            registeredBy: 'peter',
            pinCode: '1234',
            doorIds: ['garage'],
            restrictions: [],
        }

        await repository.savePinCodeRegistration(registration)

        const updateRegistration = {
            registeredBy: 'peter',
            pinCode: '1234',
            doorIds: ['main', 'garage'],
            restrictions: [],
        }

        await repository.savePinCodeRegistration(updateRegistration)

        const result = await repository.getRegistration('peter', '1234')
        expect(result).toEqual(updateRegistration)
    })

    it('should delete a PIN code registration', async () => {
        const registration = {
            registeredBy: 'peter',
            pinCode: '1234',
            doorIds: ['garage'],
            restrictions: [],
        }

        await repository.savePinCodeRegistration(registration)

        await repository.deletePinCodeRegistration('peter', '1234')

        const result = await repository.getRegistration('peter', '1234')
        expect(result).toBeNull()
    })

    it('should validate PIN with restrictions (valid period)',  async () => {
        const now = new Date()
        const validFrom = new Date(now.getTime() - 1000 * 60 * 60)
        const validTo = new Date(now.getTime() + 1000 * 60 * 60)

        const registration = {
            registeredBy: 'thor',
            pinCode: '9999',
            doorIds: ['gym'],
            restrictions: [{ validFrom, validTo }]
        }

        await repository.savePinCodeRegistration(registration)

        const isValid = await repository.isPinValidForDoor('9999', 'gym', now)
        expect(isValid).toBe(true)
    })

    it('should not validate PIN if outside restrictions', async () => {
        const now = new Date()
        const validFrom = new Date(now.getTime() + 1000 * 60 * 60)
        const validTo = new Date(now.getTime() + 1000 * 60 * 60 * 2)

        const registration = {
            registeredBy: 'groot',
            pinCode: '4444',
            doorIds: ['main'],
            restrictions: [{ validFrom, validTo }],
        }

        await repository.savePinCodeRegistration(registration)

        const isValid = await repository.isPinValidForDoor('4444', 'main', now)
        expect(isValid).toBe(false)
    })

    it('should return all registrations', async () => {
        const registration1 = {
            registeredBy: 'peter',
            pinCode: '1234',
            doorIds: ['garage'],
            restrictions: [],
        }

        const registration2 = {
            registeredBy: 'wanda',
            pinCode: '5678',
            doorIds: ['spa'],
            restrictions: [],
        }

        await repository.savePinCodeRegistration(registration1)
        await repository.savePinCodeRegistration(registration2)

        const result = await repository.findAll()
        expect(result).toHaveLength(2)
        expect(result).toEqual(expect.arrayContaining([registration1, registration2]))
    })
})