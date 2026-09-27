import classics from './classics.json'
import voa from './voa-lincoln.json'
import modern from './modern.json'
import a from './guides/classics-a.json'
import b from './guides/classics-b.json'
import c from './guides/voa-lincoln.json'
import type { ContentFiles } from '../lib/content-validation'

export const bundledContent: ContentFiles = {
  'classics.json': classics, 'voa-lincoln.json': voa, 'modern.json': modern,
  'guides/classics-a.json': a, 'guides/classics-b.json': b, 'guides/voa-lincoln.json': c,
}
