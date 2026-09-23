import {
  DEFAULT_STORAGE_STATE,
  StorageSchema
} from '@focusflow/shared';

export class ChromeStorageService {
  private static instance: ChromeStorageService;

  public static getInstance(): ChromeStorageService {
    if (!ChromeStorageService.instance) {
      ChromeStorageService.instance = new ChromeStorageService();
    }
    return ChromeStorageService.instance;
  }

  /**
   * Initializes storage with defaults if not already set
   */
  public async initialize(): Promise<StorageSchema> {
    const current = await this.getAll();
    if (!current || !current.version) {
      await this.setAll(DEFAULT_STORAGE_STATE);
      return DEFAULT_STORAGE_STATE;
    }
    return current;
  }

  /**
   * Retrieves all values in storage
   */
  public async getAll(): Promise<StorageSchema> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const data = await chrome.storage.local.get(null);
      return data as StorageSchema;
    }
    // Fallback for mock/test environments
    return DEFAULT_STORAGE_STATE;
  }

  /**
   * Retrieves a specific key from storage
   */
  public async get<K extends keyof StorageSchema>(key: K): Promise<StorageSchema[K]> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const res = await chrome.storage.local.get(key);
      if (res[key] !== undefined) {
        return res[key] as StorageSchema[K];
      }
    }
    return DEFAULT_STORAGE_STATE[key];
  }

  /**
   * Saves a specific key to storage
   */
  public async set<K extends keyof StorageSchema>(key: K, value: StorageSchema[K]): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ [key]: value });
    }
  }

  /**
   * Overwrites entire storage schema
   */
  public async setAll(data: Partial<StorageSchema>): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set(data);
    }
  }

  /**
   * Subscribes to storage changes
   */
  public subscribe<K extends keyof StorageSchema>(
    key: K,
    callback: (newValue: StorageSchema[K], oldValue: StorageSchema[K] | undefined) => void
  ): () => void {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.onChanged) {
      return () => {};
    }

    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes[key]) {
        callback(
          changes[key].newValue as StorageSchema[K],
          changes[key].oldValue as StorageSchema[K] | undefined
        );
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }

  /**
   * Adds a blocked domain to a specific profile
   */
  public async addBlockedDomain(profileId: string, domain: string): Promise<boolean> {
    const profiles = await this.get('profiles');
    if (!profiles || !profiles[profileId]) return false;

    const currentList = profiles[profileId].blockedDomains || [];
    if (currentList.includes(domain)) return false;

    const updatedProfile = {
      ...profiles[profileId],
      blockedDomains: [...currentList, domain],
      updatedAt: Date.now()
    };

    await this.set('profiles', {
      ...profiles,
      [profileId]: updatedProfile
    });

    return true;
  }

  /**
   * Removes a blocked domain from a specific profile
   */
  public async removeBlockedDomain(profileId: string, domain: string): Promise<boolean> {
    const profiles = await this.get('profiles');
    if (!profiles || !profiles[profileId]) return false;

    const currentList = profiles[profileId].blockedDomains || [];
    const updatedList = currentList.filter((d) => d !== domain);

    const updatedProfile = {
      ...profiles[profileId],
      blockedDomains: updatedList,
      updatedAt: Date.now()
    };

    await this.set('profiles', {
      ...profiles,
      [profileId]: updatedProfile
    });

    return true;
  }

  /**
   * Edits an existing blocked domain in a specific profile
   */
  public async editBlockedDomain(
    profileId: string,
    oldDomain: string,
    newDomain: string
  ): Promise<boolean> {
    const profiles = await this.get('profiles');
    if (!profiles || !profiles[profileId]) return false;

    const currentList = profiles[profileId].blockedDomains || [];
    const index = currentList.indexOf(oldDomain);
    if (index === -1) return false;

    const updatedList = [...currentList];
    updatedList[index] = newDomain;

    const updatedProfile = {
      ...profiles[profileId],
      blockedDomains: updatedList,
      updatedAt: Date.now()
    };

    await this.set('profiles', {
      ...profiles,
      [profileId]: updatedProfile
    });

    return true;
  }

  /**
   * Clears all storage data and resets to defaults
   */
  public async resetToDefaults(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.clear();
      await chrome.storage.local.set(DEFAULT_STORAGE_STATE);
    }
  }
}

export const storageService = ChromeStorageService.getInstance();
