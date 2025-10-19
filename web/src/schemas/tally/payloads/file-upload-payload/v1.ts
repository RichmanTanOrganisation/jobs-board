import { z } from "zod";

/**
 * FileUploadPayload v1 Schema
 *
 * Based on empirical testing with test form
 *
 * Key discoveries from API response:
 * 1. allowedFiles is an OBJECT grouped by MIME type, not a flat array
 *    Example: { "application/*": [".pdf", ".doc"], "image/*": [".jpg"] }
 * 2. Feature flags: hasMultipleFiles, hasMaxFiles + maxFiles, hasMinFiles + minFiles
 * 3. CSV appears in BOTH "application/*" and "text/*" categories (Tally convention)
 * 4. NO placeholder field (FILE_UPLOAD doesn't support placeholder text)
 *
 * Empirical API response structure:
 * {
 *   "type": "FILE_UPLOAD",
 *   "groupUuid": "3b78e887-6a17-4a3b-9ab3-d629cbe41bf5",
 *   "groupType": "FILE_UPLOAD",
 *   "payload": {
 *     "isRequired": true,
 *     "hasMultipleFiles": true,
 *     "hasMaxFiles": true,
 *     "maxFiles": 5,
 *     "allowedFiles": {
 *       "application/*": [".pdf", ".doc", ".docx"],
 *       "image/*": [".jpg", ".jpeg", ".png"]
 *     }
 *   }
 * }
 */
export const FileUploadPayload = z
  .object({
    isHidden: z.boolean().optional(),
    isRequired: z.boolean().optional(),

    // Multiple files
    hasMultipleFiles: z.boolean().optional(),

    // Max files (feature flag + value)
    hasMaxFiles: z.boolean().optional(),
    maxFiles: z.number().optional(),

    // Min files (exists in API, not exposed in UI for simplicity)
    hasMinFiles: z.boolean().optional(),
    minFiles: z.number().optional(),

    // Max file size (exists in API, not exposed in UI for simplicity)
    hasMaxFileSize: z.boolean().optional(),
    maxFileSize: z.number().optional(),

    // CRITICAL: Object with MIME type keys, not flat array!
    // Structure: { "application/*": [".pdf"], "image/*": [".jpg"], "text/*": [".txt"] }
    allowedFiles: z.record(z.string(), z.array(z.string())).optional(),

    // Layout fields
    columnListUuid: z.string().optional(),
    columnUuid: z.string().optional(),
    columnRatio: z.number().optional(),

    name: z.string().optional(),
  })
  .passthrough() // Allow undocumented Tally fields
  .superRefine((v, ctx) => {
    // maxFiles only valid when hasMaxFiles is true
    if (v.maxFiles && !v.hasMaxFiles) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxFiles"],
        message: "maxFiles requires hasMaxFiles to be true",
      });
    }

    // minFiles only valid when hasMinFiles is true
    if (v.minFiles && !v.hasMinFiles) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minFiles"],
        message: "minFiles requires hasMinFiles to be true",
      });
    }

    // maxFileSize only valid when hasMaxFileSize is true
    if (v.maxFileSize && !v.hasMaxFileSize) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxFileSize"],
        message: "maxFileSize requires hasMaxFileSize to be true",
      });
    }
  });

export type FileUploadPayload = z.infer<typeof FileUploadPayload>;
