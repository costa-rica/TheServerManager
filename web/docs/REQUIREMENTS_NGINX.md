# Nginx API Response Requirements

## Overview

This document specifies the data structure required by the frontend TableNginxFiles component to properly display nginx configuration information.

## GET /nginx Endpoint Requirements

The GET `/nginx` endpoint must return an array of nginx configuration objects with the following structure:

### Required Fields

```typescript
{
  // Nginx Configuration Basic Info
  _id: string;                    // MongoDB document ID
  serverName: string;             // Primary server name (e.g., "api.example.com")
  portNumber: number;             // Port number (e.g., 3000)
  serverNameArrayOfAdditionalServerNames: string[];  // Additional server names
  framework: string;              // Framework type (e.g., "ExpressJs", "nextJsPython")
  storeDirectory: string;         // Configuration file storage path
  createdAt: string;              // ISO timestamp
  updatedAt: string;              // ISO timestamp
  __v: number;                    // MongoDB version key

  // App Host Server Machine (MUST BE POPULATED OBJECT, not just publicId)
  appHostServerMachineId: {
    _id: string;                  // MongoDB document ID
    machineName: string;          // Machine name (e.g., "maestro06", "avatar07")
    urlApiForTsmNetwork: string;         // API URL (e.g., "https://tsm-api.maestro06.example.com")
    localIpAddress: string;       // Local IP (e.g., "192.168.1.100")
    userHomeDir: string;          // User home directory path
    nginxStoragePathOptions: string[];  // Available storage paths
    createdAt: string;            // ISO timestamp
    updatedAt: string;            // ISO timestamp
    __v: number;                  // MongoDB version key
  } | null;                       // null if reference is missing

  // Nginx Host Server Machine (MUST BE POPULATED OBJECT, not just publicId)
  nginxHostServerMachineId: {
    _id: string;                  // MongoDB document ID
    machineName: string;          // Machine name (e.g., "maestro06", "avatar07")
    urlApiForTsmNetwork: string;         // API URL (e.g., "https://tsm-api.maestro06.example.com")
    localIpAddress: string;       // Local IP (e.g., "192.168.1.100")
    userHomeDir: string;          // User home directory path
    nginxStoragePathOptions: string[];  // Available storage paths
    createdAt: string;            // ISO timestamp
    updatedAt: string;            // ISO timestamp
    __v: number;                  // MongoDB version key
  } | null;                       // null if reference is missing
}
```

### Example Response

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "serverName": "api.example.com",
  "portNumber": 3000,
  "serverNameArrayOfAdditionalServerNames": ["www.api.example.com"],
  "framework": "ExpressJs",
  "storeDirectory": "/etc/nginx/sites-available",
  "createdAt": "2025-12-25T10:30:00.000Z",
  "updatedAt": "2025-12-25T10:30:00.000Z",
  "__v": 0,
  "appHostServerMachineId": {
    "_id": "64a8f2b3c1d4e5f6a7b8c9d0",
    "machineName": "maestro06",
    "urlApiForTsmNetwork": "https://tsm-api.maestro06.dashanddata.com",
    "localIpAddress": "192.168.1.100",
    "userHomeDir": "/home/user",
    "nginxStoragePathOptions": [
      "/etc/nginx/sites-available",
      "/etc/nginx/conf.d"
    ],
    "createdAt": "2025-12-20T08:00:00.000Z",
    "updatedAt": "2025-12-20T08:00:00.000Z",
    "__v": 0
  },
  "nginxHostServerMachineId": {
    "_id": "64a8f2b3c1d4e5f6a7b8c9d1",
    "machineName": "avatar07",
    "urlApiForTsmNetwork": "https://tsm-api.avatar07.dashanddata.com",
    "localIpAddress": "192.168.1.101",
    "userHomeDir": "/home/user",
    "nginxStoragePathOptions": [
      "/etc/nginx/sites-available",
      "/etc/nginx/conf.d"
    ],
    "createdAt": "2025-12-20T09:00:00.000Z",
    "updatedAt": "2025-12-20T09:00:00.000Z",
    "__v": 0
  }
}
```

## Critical Implementation Notes

### 1. Machine References Must Be Populated

The backend MUST use `.populate()` on the machine reference fields:

```javascript
// Example Mongoose query
NginxFile.find()
  .populate("appHostServerMachineId")
  .populate("nginxHostServerMachineId")
  .exec();
```

**Do NOT return just the publicId strings.** The frontend needs the full machine objects to display:

- Machine names in the table
- Local IP addresses
- API URLs
- Other machine metadata

### 2. Null Handling

Either machine reference (`appHostServerMachineId` or `nginxHostServerMachineId`) can be `null` if:

- The reference was never set
- The referenced machine document was deleted
- The reference is invalid

The frontend will display "Not Available (null)" for null references and will trigger a notification modal if null references are detected.

### 3. Field Names

The current frontend implementation uses:

- `appHostServerMachineId` (NOT `appHostServerMachinePublicId`)
- `nginxHostServerMachineId` (NOT `nginxHostServerMachinePublicId`)

If the backend schema uses different field names, the response must be transformed to match these field names.

## Frontend Usage

The TableNginxFiles component displays:

| Column           | Data Source                                                                    |
| ---------------- | ------------------------------------------------------------------------------ |
| Server Name      | `serverName` + `serverNameArrayOfAdditionalServerNames`                        |
| Port             | `portNumber`                                                                   |
| App Host Machine | `appHostServerMachineId.machineName` + `appHostServerMachineId.localIpAddress` |
| Framework        | `framework`                                                                    |
| Config Storage   | `storeDirectory` + nginx host details                                          |
| Actions          | Delete button using `_id` and `serverName`                                     |

The component also provides:

- Search filtering across server names, IP addresses, framework, and storage paths
- Null detection for missing machine references
- Expandable sections for additional server names and nginx host details

## Version History

| Date       | Version | Changes                       |
| ---------- | ------- | ----------------------------- |
| 2025-12-28 | 1.0     | Initial requirements document |
