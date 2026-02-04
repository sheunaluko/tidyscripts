/**
 * EVM Account Yield Manager - Secure Keystore
 *
 * Encrypted private key storage and account management
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
    EncryptedKeyStore,
    EVMAccount,
    EVMManagerError,
    EVMManagerConfig,
} from './types';

// ============================================================================
// Constants
// ============================================================================

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const ITERATIONS = 100000;

// ============================================================================
// Keystore Manager
// ============================================================================

export class KeystoreManager {
    private keystorePath: string;
    private cachedAccounts: Map<string, EncryptedKeyStore> = new Map();

    constructor(config: EVMManagerConfig) {
        this.keystorePath = config.keystorePath;
        this.ensureKeystoreDirectory();
        this.loadAccounts();
    }

    /**
     * Ensure keystore directory exists
     */
    private ensureKeystoreDirectory(): void {
        if (!fs.existsSync(this.keystorePath)) {
            fs.mkdirSync(this.keystorePath, { recursive: true });
        }
    }

    /**
     * Load all encrypted accounts from disk
     */
    private loadAccounts(): void {
        const keystoreFile = path.join(this.keystorePath, 'accounts.json');
        if (fs.existsSync(keystoreFile)) {
            try {
                const data = JSON.parse(fs.readFileSync(keystoreFile, 'utf-8'));
                for (const account of data.accounts || []) {
                    this.cachedAccounts.set(account.address.toLowerCase(), account);
                }
            } catch (error) {
                console.error('Failed to load keystore:', error);
            }
        }
    }

    /**
     * Save all accounts to disk
     */
    private saveAccounts(): void {
        const keystoreFile = path.join(this.keystorePath, 'accounts.json');
        const data = {
            version: 1,
            accounts: Array.from(this.cachedAccounts.values()),
        };
        fs.writeFileSync(keystoreFile, JSON.stringify(data, null, 2));
    }

    /**
     * Derive encryption key from password
     */
    private deriveKey(password: string, salt: Buffer): Buffer {
        return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
    }

    /**
     * Encrypt a private key with password
     */
    private encryptPrivateKey(
        privateKey: string,
        password: string
    ): { encryptedKey: string; iv: string; salt: string; tag: string } {
        const salt = crypto.randomBytes(SALT_LENGTH);
        const key = this.deriveKey(password, salt);
        const iv = crypto.randomBytes(IV_LENGTH);

        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        let encrypted = cipher.update(privateKey, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const tag = cipher.getAuthTag();

        return {
            encryptedKey: encrypted,
            iv: iv.toString('hex'),
            salt: salt.toString('hex'),
            tag: tag.toString('hex'),
        };
    }

    /**
     * Decrypt a private key with password
     */
    private decryptPrivateKey(
        encryptedData: {
            encryptedKey: string;
            iv: string;
            salt: string;
            tag: string;
        },
        password: string
    ): string {
        const salt = Buffer.from(encryptedData.salt, 'hex');
        const key = this.deriveKey(password, salt);
        const iv = Buffer.from(encryptedData.iv, 'hex');
        const tag = Buffer.from(encryptedData.tag, 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(encryptedData.encryptedKey, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    /**
     * Import an account from private key
     */
    async importAccount(
        privateKey: string,
        password: string,
        nickname?: string
    ): Promise<EVMAccount> {
        // Validate private key format
        let cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
        if (!/^[a-fA-F0-9]{64}$/.test(cleanKey)) {
            throw new EVMManagerError(
                'Invalid private key format',
                'INVALID_PRIVATE_KEY'
            );
        }

        // Derive address from private key using native crypto
        const address = this.deriveAddress(cleanKey);

        // Check if account already exists
        if (this.cachedAccounts.has(address.toLowerCase())) {
            throw new EVMManagerError(
                'Account already exists',
                'ACCOUNT_EXISTS',
                { address }
            );
        }

        // Encrypt and store
        const encrypted = this.encryptPrivateKey(cleanKey, password);
        const keystore: EncryptedKeyStore = {
            address: address.toLowerCase(),
            encryptedKey: JSON.stringify(encrypted),
            iv: encrypted.iv,
            createdAt: Date.now(),
            chainType: 'evm',
        };

        this.cachedAccounts.set(address.toLowerCase(), keystore);
        this.saveAccounts();

        return {
            address: address.toLowerCase(),
            nickname,
            createdAt: keystore.createdAt,
        };
    }

    /**
     * Derive address from private key using native crypto
     */
    private deriveAddress(privateKeyHex: string): string {
        // Create ECDSA key pair
        const privateKeyBuffer = Buffer.from(privateKeyHex, 'hex');

        // Use secp256k1 to derive public key
        const { publicKey } = crypto.generateKeyPairSync('ec', {
            namedCurve: 'secp256k1',
            privateKeyEncoding: { type: 'pkcs8', format: 'der' },
            publicKeyEncoding: { type: 'spki', format: 'der' },
        });

        // For EVM, we need to use a proper derivation
        // This is a simplified placeholder - in production, use ethers.js
        const hash = crypto.createHash('sha256').update(privateKeyBuffer).digest();
        const addressBytes = crypto.createHash('sha256').update(hash).digest().slice(12);
        return '0x' + addressBytes.toString('hex');
    }

    /**
     * Generate a new random account
     */
    async generateAccount(
        password: string,
        nickname?: string
    ): Promise<EVMAccount> {
        // Generate random private key
        const privateKey = crypto.randomBytes(32).toString('hex');
        return this.importAccount(privateKey, password, nickname);
    }

    /**
     * Get decrypted private key for signing
     */
    async getPrivateKey(address: string, password: string): Promise<string> {
        const keystore = this.cachedAccounts.get(address.toLowerCase());
        if (!keystore) {
            throw new EVMManagerError('Account not found', 'ACCOUNT_NOT_FOUND', {
                address,
            });
        }

        try {
            const encrypted = JSON.parse(keystore.encryptedKey);
            return this.decryptPrivateKey(encrypted, password);
        } catch (error) {
            throw new EVMManagerError(
                'Invalid password or corrupted keystore',
                'DECRYPTION_FAILED'
            );
        }
    }

    /**
     * List all accounts
     */
    listAccounts(): EVMAccount[] {
        return Array.from(this.cachedAccounts.values()).map((ks) => ({
            address: ks.address,
            createdAt: ks.createdAt,
        }));
    }

    /**
     * Check if an account exists
     */
    hasAccount(address: string): boolean {
        return this.cachedAccounts.has(address.toLowerCase());
    }

    /**
     * Remove an account
     */
    removeAccount(address: string, password: string): boolean {
        const normalizedAddress = address.toLowerCase();

        // Verify password before removing
        try {
            this.getPrivateKey(normalizedAddress, password);
        } catch {
            throw new EVMManagerError(
                'Invalid password',
                'INVALID_PASSWORD'
            );
        }

        const deleted = this.cachedAccounts.delete(normalizedAddress);
        if (deleted) {
            this.saveAccounts();
        }
        return deleted;
    }

    /**
     * Export encrypted keystore in standard format
     */
    async exportKeystore(
        address: string,
        password: string,
        exportPassword: string
    ): Promise<string> {
        const privateKey = await this.getPrivateKey(address, password);
        const encrypted = this.encryptPrivateKey(privateKey, exportPassword);

        const keystore = {
            version: 1,
            address: address.toLowerCase(),
            crypto: {
                cipher: ALGORITHM,
                ciphertext: encrypted.encryptedKey,
                cipherparams: {
                    iv: encrypted.iv,
                },
                kdf: 'pbkdf2',
                kdfparams: {
                    c: ITERATIONS,
                    dklen: KEY_LENGTH,
                    prf: 'hmac-sha256',
                    salt: encrypted.salt,
                },
                mac: encrypted.tag,
            },
        };

        return JSON.stringify(keystore, null, 2);
    }

    /**
     * Change password for an account
     */
    async changePassword(
        address: string,
        oldPassword: string,
        newPassword: string
    ): Promise<void> {
        const privateKey = await this.getPrivateKey(address, oldPassword);
        const encrypted = this.encryptPrivateKey(privateKey, newPassword);

        const keystore = this.cachedAccounts.get(address.toLowerCase());
        if (keystore) {
            keystore.encryptedKey = JSON.stringify(encrypted);
            keystore.iv = encrypted.iv;
            this.saveAccounts();
        }
    }
}

// ============================================================================
// Factory Function
// ============================================================================

let keystoreInstance: KeystoreManager | null = null;

/**
 * Get or create keystore manager instance
 */
export function getKeystoreManager(config: EVMManagerConfig): KeystoreManager {
    if (!keystoreInstance) {
        keystoreInstance = new KeystoreManager(config);
    }
    return keystoreInstance;
}

/**
 * Reset keystore manager (for testing)
 */
export function resetKeystoreManager(): void {
    keystoreInstance = null;
}
