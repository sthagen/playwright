/**
 * Copyright 2018 Google Inc. All rights reserved.
 * Modifications copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import './base.fixture';

it('should work', async({page, server}) => {
  await page.setExtraHTTPHeaders({
    foo: 'bar'
  });
  const [request] = await Promise.all([
    server.waitForRequest('/empty.html'),
    page.goto(server.EMPTY_PAGE),
  ]);
  expect(request.headers['foo']).toBe('bar');
});

it('should work with redirects', async({page, server}) => {
  server.setRedirect('/foo.html', '/empty.html');
  await page.setExtraHTTPHeaders({
    foo: 'bar'
  });
  const [request] = await Promise.all([
    server.waitForRequest('/empty.html'),
    page.goto(server.PREFIX + '/foo.html'),
  ]);
  expect(request.headers['foo']).toBe('bar');
});

it('should work with extra headers from browser context', async({browser, server}) => {
  const context = await browser.newContext();
  await context.setExtraHTTPHeaders({
    'foo': 'bar',
  });
  const page = await context.newPage();
  const [request] = await Promise.all([
    server.waitForRequest('/empty.html'),
    page.goto(server.EMPTY_PAGE),
  ]);
  await context.close();
  expect(request.headers['foo']).toBe('bar');
});

it('should override extra headers from browser context', async({browser, server}) => {
  const context = await browser.newContext({
    extraHTTPHeaders: { 'fOo': 'bAr', 'baR': 'foO' },
  });
  const page = await context.newPage();
  await page.setExtraHTTPHeaders({
    'Foo': 'Bar'
  });
  const [request] = await Promise.all([
    server.waitForRequest('/empty.html'),
    page.goto(server.EMPTY_PAGE),
  ]);
  await context.close();
  expect(request.headers['foo']).toBe('Bar');
  expect(request.headers['bar']).toBe('foO');
});

it('should throw for non-string header values', async({page, server}) => {
  let error = null;
  try {
    await page.setExtraHTTPHeaders({ 'foo': 1 as any });
  } catch (e) {
    error = e;
  }
  expect(error.message).toContain('Expected value of header "foo" to be String, but "number" is found.');
});
