import { EmptyMJMLError } from './Error'
import { html as beautify } from 'js-beautify'
import { minify } from 'html-minifier'
import { parseInstance } from './helpers/mjml'
import defaultContainer from './configs/defaultContainer'
import documentParser from './documentParser'
import dom from './helpers/dom'
import {insertColumnMediaQuery, fixLegacyAttrs, fixOutlookLayout, clean, removeCDATA } from './helpers/post_render'
import getFontsImports from './helpers/getFontsImports'
import MJMLElementsCollection from './MJMLElementsCollection'
import React from 'react'
import ReactDOMServer from 'react-dom/server'

const debug = require('debug')('mjml-engine/mjml2html')

export default class MJMLRenderer {
  constructor(content, options) {
    this.content = content
    this.options = options

    if (typeof this.content == 'string') {
      this.parseDocument()
    }
  }

  parseDocument() {
    debug('Start parsing document')
    this.content = documentParser(this.content)
    debug('Content parsed.')
  }

  render() {
    if (!this.content) {
      throw new EmptyMJMLError(`.render: No MJML to render in options ${this.options.toString()}`)
    }

    const rootElemComponent = React.createElement(MJMLElementsCollection[this.content.tagName.substr(3)], { mjml: parseInstance(this.content) })

    debug('Render to static markup')
    const renderedMJML = ReactDOMServer.renderToStaticMarkup(rootElemComponent)

    debug('React rendering done. Continue with special overrides.')

    const MJMLDocument = defaultContainer({ title: this.options.title, content: renderedMJML, fonts: getFontsImports({ content: renderedMJML }) })

    return this._postRender(MJMLDocument)
  }

  _postRender(MJMLDocument) {
    let $ = dom.parseHTML(MJMLDocument)

    $ = insertColumnMediaQuery(this.$)
    $ = fixLegacyAttrs(this.$)
    $ = fixOutlookLayout(this.$)
    $ = clean(this.$)

    let finalMJMLDocument = dom.getHTML($)
    finalMJMLDocument     = removeCDATA(MJMLDocument)

    if (this.options.beautify && beautify) {
      finalMJMLDocument = beautify(finalMJMLDocument, {
        indent_size: 2,
        wrap_attributes_indent_size: 2
      })
    }

    if (this.options.minify && minify) {
      finalMJMLDocument = minify(finalMJMLDocument, {
        collapseWhitespace: true,
        removeEmptyAttributes: true,
        minifyCSS: true
      })
    }

    return finalMJMLDocument
  }
}