import { apiClient } from "./retailer-api";

export interface EncryptedEnvelope {
  v: number;
  alg: string;
  iv: string;
  ciphertext: string;
  tag: string;
}

export interface EncryptResult {
  success: boolean;
  encrypted_envelope: EncryptedEnvelope;
  key_version: number;
  created_at: string;
  record_id?: string;
}

export interface DecryptResult<T = any> {
  success: boolean;
  decrypted_data: T;
}

export interface EncryptedRecord<T = any> {
  id: string;
  resource_type: string;
  resource_id?: string;
  encrypted_envelope: EncryptedEnvelope;
  key_version: number;
  metadata_tags?: Record<string, any>;
  created_at?: string;
  decrypted_data?: T;
  decryption_error?: string;
}

/**
 * Enterprise Retailer Crypto Service.
 * Provides authenticated symmetric envelope encryption and decryption for sensitive data at rest and in transit.
 */
export const retailerCryptoService = {
  /**
   * Encrypts sensitive data using AES-256-GCM authenticated encryption.
   */
  async encrypt<T = any>(
    resourceType: "ORDER_NOTE" | "INVOICE" | "CUSTOMER_DATA" | "PRIVATE_NOTE" | "PAYMENT_PAYLOAD" | string,
    data: T,
    resourceId?: string,
    saveToDatabase: boolean = false,
    metadataTags?: Record<string, any>
  ): Promise<EncryptResult> {
    const res = await apiClient.post<EncryptResult>("/retailer/crypto/encrypt", {
      resource_type: resourceType,
      resource_id: resourceId,
      data,
      save_to_database: saveToDatabase,
      metadata_tags: metadataTags,
    });
    return res.data;
  },

  /**
   * Decrypts an AES-256-GCM encrypted envelope for the authorized retailer session.
   * Fails closed if the envelope or tag was tampered with or corrupted.
   */
  async decrypt<T = any>(
    resourceType: string,
    encryptedEnvelope: EncryptedEnvelope,
    resourceId?: string
  ): Promise<T> {
    const res = await apiClient.post<DecryptResult<T>>("/retailer/crypto/decrypt", {
      resource_type: resourceType,
      resource_id: resourceId,
      encrypted_envelope: encryptedEnvelope,
    });
    return res.data.decrypted_data;
  },

  /**
   * Lists persisted encrypted records for the authenticated retailer.
   */
  async listRecords<T = any>(
    resourceType?: string,
    autoDecrypt: boolean = true,
    limit: number = 50
  ): Promise<EncryptedRecord<T>[]> {
    const res = await apiClient.get<{ success: boolean; records: EncryptedRecord<T>[] }>(
      "/retailer/crypto/records",
      {
        params: {
          resource_type: resourceType,
          auto_decrypt: autoDecrypt,
          limit,
        },
      }
    );
    return res.data.records || [];
  },

  /**
   * Retrieves a single encrypted record and decrypts it automatically for the session.
   */
  async getRecord<T = any>(recordId: string, autoDecrypt: boolean = true): Promise<EncryptedRecord<T>> {
    const res = await apiClient.get<{ success: boolean; record: EncryptedRecord<T> }>(
      `/retailer/crypto/records/${recordId}`,
      {
        params: { auto_decrypt: autoDecrypt },
      }
    );
    return res.data.record;
  },
};
