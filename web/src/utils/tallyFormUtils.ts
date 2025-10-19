import { FormField } from '@/app/components/TallyFormBuilder/TallyFormBuilder';

/**
 * MIME type mapping for FILE_UPLOAD allowedFiles conversion
 * Maps file extensions to their MIME type categories used by Tally API
 */
const MIME_TYPE_MAPPING: Record<string, string> = {
  // Documents & Archives (application/*)
  '.pdf': 'application/*',
  '.doc': 'application/*',
  '.docx': 'application/*',
  '.xlsx': 'application/*',
  '.zip': 'application/*',

  // Images (image/*)
  '.jpg': 'image/*',
  '.jpeg': 'image/*',
  '.png': 'image/*',

  // Text (text/*)
  '.txt': 'text/*',
  '.csv': 'text/*',  // Primary category
};

/**
 * Convert flat array of file extensions to Tally's allowedFiles object format.
 * Groups extensions by MIME type category.
 *
 * Special case: CSV appears in BOTH text/* and application/* (Tally convention from API testing).
 *
 * @param extensions - Array of file extensions (e.g., ['.pdf', '.jpg', '.csv'])
 * @returns Object grouped by MIME type (e.g., { "application/*": [".pdf"], "image/*": [".jpg"] })
 *
 * @example
 * convertFileTypesToAllowedFiles(['.pdf', '.jpg', '.csv'])
 * // Returns: {
 * //   "application/*": [".pdf", ".csv"],
 * //   "image/*": [".jpg"],
 * //   "text/*": [".csv"]
 * // }
 */
function convertFileTypesToAllowedFiles(extensions: string[]): Record<string, string[]> {
  const allowedFiles: Record<string, string[]> = {};

  extensions.forEach(ext => {
    const mimeType = MIME_TYPE_MAPPING[ext];
    if (!mimeType) return;

    if (!allowedFiles[mimeType]) {
      allowedFiles[mimeType] = [];
    }
    allowedFiles[mimeType].push(ext);
  });

  // Special: Add CSV to application/* if selected (matches Tally API pattern from test form)
  if (extensions.includes('.csv')) {
    if (!allowedFiles['application/*']) {
      allowedFiles['application/*'] = [];
    }
    if (!allowedFiles['application/*'].includes('.csv')) {
      allowedFiles['application/*'].push('.csv');
    }
  }

  return allowedFiles;
}

/**
 * Convert FormFields to Tally blocks format
 *
 * This utility function transforms user-configured form fields into the
 * block structure required by the Tally API.
 *
 * @param formTitle - The title of the form (becomes FORM_TITLE block)
 * @param fields - Array of form fields configured by the user
 * @returns Array of Tally API blocks
 */
export function convertToTallyBlocks(formTitle: string, fields: FormField[]) {
  const blocks = [];

  // 1. FORM_TITLE (always first)
  blocks.push({
    uuid: crypto.randomUUID(),
    type: 'FORM_TITLE',
    groupUuid: crypto.randomUUID(),
    groupType: 'FORM_TITLE',
    payload: {
      html: formTitle
    }
  });

  // 2. User-configured fields
  fields.forEach(field => {
    // INPUT_TEXT: Requires TITLE + INPUT_TEXT pair (separate groupUuids)
    if (field.type === 'INPUT_TEXT') {
      const titleGroupUuid = crypto.randomUUID();
      const inputGroupUuid = crypto.randomUUID();

      // TITLE block with question text
      blocks.push({
        uuid: crypto.randomUUID(),
        type: 'TITLE',
        groupUuid: titleGroupUuid,
        groupType: 'QUESTION',
        payload: {
          html: field.label
        }
      });

      // INPUT_TEXT block with configuration
      blocks.push({
        uuid: crypto.randomUUID(),
        type: 'INPUT_TEXT',
        groupUuid: inputGroupUuid,
        groupType: 'INPUT_TEXT',
        payload: {
          isRequired: field.required,
          placeholder: field.placeholder || ''
        }
      });
    }

    // TEXTAREA: Same pattern as INPUT_TEXT (TITLE + TEXTAREA pair with separate groupUuids)
    else if (field.type === 'TEXTAREA') {
      const titleGroupUuid = crypto.randomUUID();
      const textareaGroupUuid = crypto.randomUUID();

      // TITLE block with question text
      blocks.push({
        uuid: crypto.randomUUID(),
        type: 'TITLE',
        groupUuid: titleGroupUuid,
        groupType: 'QUESTION',
        payload: {
          html: field.label
        }
      });

      // TEXTAREA block with configuration
      blocks.push({
        uuid: crypto.randomUUID(),
        type: 'TEXTAREA',
        groupUuid: textareaGroupUuid,
        groupType: 'TEXTAREA',  // CRITICAL: Must be 'TEXTAREA', not 'QUESTION'
        payload: {
          isRequired: field.required,
          placeholder: field.placeholder || ''
        }
      });
    }

    // INPUT_EMAIL: Same pattern as INPUT_TEXT (TITLE + INPUT_EMAIL pair with separate groupUuids)
    else if (field.type === 'INPUT_EMAIL') {
      const titleGroupUuid = crypto.randomUUID();
      const inputEmailGroupUuid = crypto.randomUUID();

      // TITLE block with question text
      blocks.push({
        uuid: crypto.randomUUID(),
        type: 'TITLE',
        groupUuid: titleGroupUuid,
        groupType: 'QUESTION',
        payload: {
          html: field.label
        }
      });

      // INPUT_EMAIL block with configuration
      blocks.push({
        uuid: crypto.randomUUID(),
        type: 'INPUT_EMAIL',
        groupUuid: inputEmailGroupUuid,
        groupType: 'INPUT_EMAIL',  // CRITICAL: Must be 'INPUT_EMAIL', not 'QUESTION'
        payload: {
          isRequired: field.required,
          placeholder: field.placeholder || ''
        }
      });
    }

    // INPUT_PHONE_NUMBER: Same pattern as INPUT_EMAIL (TITLE + INPUT_PHONE_NUMBER pair with separate groupUuids)
    else if (field.type === 'INPUT_PHONE_NUMBER') {
      const titleGroupUuid = crypto.randomUUID();
      const inputPhoneGroupUuid = crypto.randomUUID();

      // TITLE block with question text
      blocks.push({
        uuid: crypto.randomUUID(),
        type: 'TITLE',
        groupUuid: titleGroupUuid,
        groupType: 'QUESTION',
        payload: {
          html: field.label
        }
      });

      // INPUT_PHONE_NUMBER block with configuration
      blocks.push({
        uuid: crypto.randomUUID(),
        type: 'INPUT_PHONE_NUMBER',
        groupUuid: inputPhoneGroupUuid,
        groupType: 'INPUT_PHONE_NUMBER',  // CRITICAL: Must be 'INPUT_PHONE_NUMBER', not 'QUESTION'
        payload: {
          isRequired: field.required,
          internationalFormat: true,        // HARDCODED: Always show country dropdown
          defaultCountryCode: "NZ",         // HARDCODED: Pre-select New Zealand for UoA
          placeholder: field.placeholder || ''
        }
      });
    }

    // FILE_UPLOAD: Same pattern as INPUT_EMAIL/INPUT_PHONE_NUMBER (TITLE + FILE_UPLOAD pair)
    else if (field.type === 'FILE_UPLOAD') {
      const titleGroupUuid = crypto.randomUUID();
      const fileUploadGroupUuid = crypto.randomUUID();

      // TITLE block with question text
      blocks.push({
        uuid: crypto.randomUUID(),
        type: 'TITLE',
        groupUuid: titleGroupUuid,
        groupType: 'QUESTION',
        payload: { html: field.label }
      });

      // FILE_UPLOAD block with configuration
      const payload: any = {
        isRequired: field.required
      };

      // Multiple files support
      if (field.allowMultipleFiles) {
        payload.hasMultipleFiles = true;

        // Max files (only when multiple = true)
        if (field.maxFiles) {
          payload.hasMaxFiles = true;
          payload.maxFiles = field.maxFiles;
        } else {
          payload.hasMaxFiles = false;
        }
      }

      // Convert file types array to allowedFiles object (grouped by MIME type)
      if (field.allowedFileTypes && field.allowedFileTypes.length > 0) {
        payload.allowedFiles = convertFileTypesToAllowedFiles(field.allowedFileTypes);
      }

      blocks.push({
        uuid: crypto.randomUUID(),
        type: 'FILE_UPLOAD',
        groupUuid: fileUploadGroupUuid,
        groupType: 'FILE_UPLOAD',  // CRITICAL: Must be 'FILE_UPLOAD', not 'QUESTION'
        payload
      });
    }

    // CHECKBOX: Single checkbox OR checkbox list (with optional TITLE)
    else if (field.type === 'CHECKBOX') {
      const checkboxGroupUuid = crypto.randomUUID();

      // Pattern A: Checkbox list with multiple options
      if (field.options && field.options.length > 0) {
        // Optional TITLE block for the question
        if (field.questionText) {
          const questionGroupUuid = crypto.randomUUID();
          blocks.push({
            uuid: crypto.randomUUID(),
            type: 'TITLE',
            groupUuid: questionGroupUuid,
            groupType: 'QUESTION',
            payload: {
              html: field.questionText  // "Which skills do you have?"
            }
          });
        }

        // Create separate checkbox for each option
        field.options.forEach((optionText, index) => {
          blocks.push({
            uuid: crypto.randomUUID(),
            type: 'CHECKBOX',
            groupUuid: checkboxGroupUuid,  // Same group for all
            groupType: 'CHECKBOXES',
            payload: {
              text: optionText,
              index: index,
              isFirst: index === 0,
              isLast: index === field.options!.length - 1,
              isRequired: field.required,
              // Min/max choices (group-level, inherited by all checkboxes)
              ...(field.minChoices && {
                hasMinChoices: true,
                minChoices: field.minChoices
              }),
              ...(field.maxChoices && {
                hasMaxChoices: true,
                maxChoices: field.maxChoices
              })
            }
          });
        });
      }
      // Pattern B: Single standalone checkbox (existing behavior)
      else {
        blocks.push({
          uuid: crypto.randomUUID(),
          type: 'CHECKBOX',
          groupUuid: checkboxGroupUuid,
          groupType: 'CHECKBOXES',
          payload: {
            text: field.label,  // "I agree to terms"
            index: 0,
            isFirst: true,
            isLast: true,
            isRequired: field.required
          }
        });
      }
    }

    // MULTIPLE_CHOICE_OPTION: Creates TITLE + separate blocks per option
    else if (field.type === 'MULTIPLE_CHOICE_OPTION' && field.options && field.options.length > 0) {
      const questionGroupUuid = crypto.randomUUID();
      const optionsGroupUuid = crypto.randomUUID();

      // TITLE block with question text
      blocks.push({
        uuid: crypto.randomUUID(),
        type: 'TITLE',
        groupUuid: questionGroupUuid,
        groupType: 'QUESTION',
        payload: {
          html: field.label
        }
      });

      // Create separate block for EACH option
      field.options.forEach((optionText, index) => {
        blocks.push({
          uuid: crypto.randomUUID(),
          type: 'MULTIPLE_CHOICE_OPTION',
          groupUuid: optionsGroupUuid,
          groupType: 'MULTIPLE_CHOICE_OPTION',
          payload: {
            text: optionText,
            index: index,
            isFirst: index === 0,
            isLast: index === field.options!.length - 1,
            isRequired: field.required,
            // Allow multiple selection support
            ...(field.allowMultiple && { allowMultiple: true }),
            // Min/max choices (only valid with allowMultiple)
            ...(field.allowMultiple && field.minChoices && {
              hasMinChoices: true,
              minChoices: field.minChoices
            }),
            ...(field.allowMultiple && field.maxChoices && {
              hasMaxChoices: true,
              maxChoices: field.maxChoices
            })
          }
        });
      });
    }

    // TEXT, LABEL, and other simple types: Use html field directly
    else {
      blocks.push({
        uuid: crypto.randomUUID(),
        type: field.type,
        groupUuid: crypto.randomUUID(),
        groupType: field.groupType,
        payload: {
          html: field.label
        }
      });
    }
  });

  return blocks;
}
