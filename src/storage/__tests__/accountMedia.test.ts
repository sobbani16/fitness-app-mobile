const mockDelete = jest.fn();
jest.mock('expo-file-system', () => ({ Paths: { cache: { uri: 'file:///app/cache/' } }, File: jest.fn().mockImplementation(uri => ({ exists: true, delete: () => mockDelete(uri) })) }));
import { removeOwnedPhotoCopies } from '../accountMedia';
it('deletes only owned picker/camera copies, preserving shared photos and non-app files', () => {
  const entries = [
    'file:///app/cache/ImagePicker/owned.jpg', 'file:///app/cache/Camera/shared.jpg',
    'file:///library/original.jpg', 'file:///app/cache/ImagePicker/%2e%2e/secrets.jpg',
    'https://example.test/photo.jpg',
  ];
  removeOwnedPhotoCopies([['a:meals', JSON.stringify(entries.map(photoUri => ({ photoUri })))]], [['b:meals', JSON.stringify([{ photoUri: entries[1] }])]]);
  expect(mockDelete.mock.calls).toEqual([[entries[0]]]);
});
