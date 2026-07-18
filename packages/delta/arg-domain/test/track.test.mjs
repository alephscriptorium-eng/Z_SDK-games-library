import test from 'node:test';
import assert from 'node:assert/strict';
import { corpusRelPath } from '@zeus/presets-sdk/paths';
import { nodoMetaPath, registroMdPath } from '@zeus/presets-sdk/paths';
import {
  resolveTrackRef,
  nodoMetaPathForTrack,
  registroMdPathForTrack,
  corpusRelPathForTrack
} from '../src/track.mjs';

test('paridad nodoMetaPath con presets-sdk', () => {
  assert.equal(nodoMetaPathForTrack('1882'), nodoMetaPath('1882'));
});

test('paridad registroMdPath con presets-sdk', () => {
  assert.equal(
    registroMdPathForTrack('wp/historia', 'P03', 12345),
    registroMdPath('wp/historia', 'P03', 12345)
  );
});

test('paridad corpusRelPath con presets-sdk', () => {
  assert.equal(corpusRelPathForTrack('raw', 'batch/a.json'), corpusRelPath('raw', 'batch/a.json'));
});

test('resolveTrackRef linea nodo', () => {
  const r = resolveTrackRef({ kind: 'nodo', uri: 'linea://nodo/1882' });
  assert.equal(r.browser, 'cache-browser');
  assert.equal(r.linea, 'espana');
  assert.equal(r.path, 'nodos/1882/meta.json');
});

test('resolveTrackRef firehose post', () => {
  const r = resolveTrackRef({ kind: 'micropost', uri: 'firehose://post/raw/batch-1/foo.json' });
  assert.equal(r.browser, 'firehose-browser');
  assert.equal(r.corpus, 'raw');
  assert.equal(r.path, 'batch-1/foo.json');
});

test('resolveTrackRef synthetic', () => {
  const r = resolveTrackRef({ kind: 'micropost', uri: 'firehose://synthetic/5/42#tema' });
  assert.equal(r.corpus, 'raw');
  assert.equal(r.path, 'synthetic/post-42.json');
});
