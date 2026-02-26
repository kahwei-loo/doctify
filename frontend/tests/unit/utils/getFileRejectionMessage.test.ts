import { describe, it, expect } from 'vitest';
import { getFileRejectionMessage } from '@/features/documents/components/DocumentUploadZone';
import type { FileRejection } from 'react-dropzone';

function createRejection(
  fileName: string,
  errors: Array<{ code: string; message: string }>
): FileRejection {
  return {
    file: new File(['content'], fileName, { type: 'application/octet-stream' }),
    errors: errors.map((e) => ({ code: e.code, message: e.message })),
  };
}

describe('getFileRejectionMessage', () => {
  it('returns unsupported type message for file-invalid-type', () => {
    const rejection = createRejection('report.exe', [
      { code: 'file-invalid-type', message: 'File type not accepted' },
    ]);
    expect(getFileRejectionMessage(rejection)).toBe(
      '"report.exe" has an unsupported file type'
    );
  });

  it('returns size limit message for file-too-large', () => {
    const rejection = createRejection('huge.pdf', [
      { code: 'file-too-large', message: 'File is too large' },
    ]);
    expect(getFileRejectionMessage(rejection)).toBe(
      '"huge.pdf" exceeds the 10MB size limit'
    );
  });

  it('returns too-small message for file-too-small', () => {
    const rejection = createRejection('tiny.txt', [
      { code: 'file-too-small', message: 'File is too small' },
    ]);
    expect(getFileRejectionMessage(rejection)).toBe('"tiny.txt" is too small');
  });

  it('returns max files message for too-many-files', () => {
    const rejection = createRejection('extra.pdf', [
      { code: 'too-many-files', message: 'Too many files' },
    ]);
    expect(getFileRejectionMessage(rejection)).toBe(
      'Too many files selected (max 20)'
    );
  });

  it('uses error.message for unknown error codes', () => {
    const rejection = createRejection('file.pdf', [
      { code: 'unknown-error', message: 'Something went wrong' },
    ]);
    expect(getFileRejectionMessage(rejection)).toBe(
      '"file.pdf": Something went wrong'
    );
  });

  it('joins multiple errors with commas', () => {
    const rejection = createRejection('bad.exe', [
      { code: 'file-invalid-type', message: 'Type not accepted' },
      { code: 'file-too-large', message: 'Too large' },
    ]);
    expect(getFileRejectionMessage(rejection)).toBe(
      '"bad.exe" has an unsupported file type, "bad.exe" exceeds the 10MB size limit'
    );
  });

  it('returns single message without comma separator', () => {
    const rejection = createRejection('ok.pdf', [
      { code: 'file-too-large', message: 'Too large' },
    ]);
    expect(getFileRejectionMessage(rejection)).not.toContain(', ');
  });

  it('includes file name in type error message', () => {
    const rejection = createRejection('document.docx', [
      { code: 'file-invalid-type', message: 'Type not accepted' },
    ]);
    expect(getFileRejectionMessage(rejection)).toContain('document.docx');
  });

  it('includes file name in size error message', () => {
    const rejection = createRejection('big-photo.png', [
      { code: 'file-too-large', message: 'Too large' },
    ]);
    expect(getFileRejectionMessage(rejection)).toContain('big-photo.png');
  });

  it('handles empty file name gracefully', () => {
    const rejection = createRejection('', [
      { code: 'file-invalid-type', message: 'Type not accepted' },
    ]);
    expect(getFileRejectionMessage(rejection)).toBe(
      '"" has an unsupported file type'
    );
  });
});
