import Debug from 'debug'
import MagicString from 'magic-string'
import { Transformer } from '../types'
import { Context } from '../context'
import { pascalCase, stringifyComponentImport } from '../utils'

const debug = Debug('vite-plugin-components:transform:vue3')

export function Vue3Transformer(ctx: Context): Transformer {
  return (code, id, path, query) => {
    if (!(path.endsWith('.vue') || ctx.options.customLoaderMatcher(id)))
      return null

    ctx.searchGlob()

    const sfcPath = ctx.normalizePath(path)
    debug(sfcPath)

    const head: string[] = []
    let no = 0
    const componentPaths: string[] = []

    const s = new MagicString(code)

    for (const match of code.matchAll(/_resolveComponent\("(.+?)"\)/g)) {
      const matchedName = match[1]
      if (match.index != null && matchedName && !matchedName.startsWith('_')) {
        const start = match.index
        const end = start + match[0].length
        debug(`| ${matchedName}`)
        const name = pascalCase(matchedName)
        componentPaths.push(name)
        const component = ctx.findComponent(name, [sfcPath])
        if (component) {
          const var_name = `__vite_components_${no}`
          head.push(stringifyComponentImport({ ...component, name: var_name }, ctx))
          no += 1
          s.overwrite(start, end, var_name)
        }
      }
    }

    debug(`^ (${no})`)

    ctx.updateUsageMap(sfcPath, componentPaths)

    s.prepend(`${head.join('\n')}\n`)

    return {
      code: s.toString(),
      map: s.generateMap(),
    }
  }
}
