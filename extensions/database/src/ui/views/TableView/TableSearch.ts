import { ICellNodePopps, INode } from '@penx/model-types'
import { Filter, OperatorType } from '@penx/model-types/src/interfaces/INode'
import { generateNoteCellText } from './cells/note-cell'

interface ISearchNode {
  id: string
  text: string
}

export class TableSearch {
  private static instance: TableSearch
  searchNodes: Map<string, Map<string, ISearchNode[]>>
  dataSourceMap: Map<string, Map<string, INode>>

  constructor(dataSource: INode[], databaseId: string) {
    this.dataSourceMap = new Map()
    this.searchNodes = new Map()

    this.initialize(dataSource, databaseId)
  }

  public static initTableSearch(
    dataSource: INode[],
    databaseId: string,
    isRebuild = false,
  ) {
    if (!this.instance) {
      this.instance = new TableSearch(dataSource, databaseId)
    } else if (this.instance && !this.instance.dataSourceMap.has(databaseId)) {
      this.instance.initialize(dataSource, databaseId)
    } else if (isRebuild) {
      if (this.instance.dataSourceMap.has(databaseId)) {
        this.instance.dataSourceMap.delete(databaseId)
        this.instance.searchNodes.delete(databaseId)
      }
      this.instance.initialize(dataSource, databaseId)
    }

    return this.instance
  }

  public static getInstance(): TableSearch {
    return this.instance
  }

  private initialize(dataSource: INode[], databaseId: string): void {
    if (!dataSource.length) {
      return
    }

    if (!this.dataSourceMap.has(databaseId)) {
      this.dataSourceMap.set(databaseId, new Map())
    }

    if (!this.searchNodes.has(databaseId)) {
      this.searchNodes.set(databaseId, new Map())
    }

    const searchNodesInner = this.searchNodes.get(databaseId) as Map<
      string,
      ISearchNode[]
    >

    const spaceNode = dataSource[0]
    const keys = Object.keys(spaceNode ? spaceNode : [])

    dataSource.forEach((item) => {
      this.dataSourceMap.get(databaseId)?.set(item.id, item)

      keys.forEach((property) => {
        let text = ''

        if (property === 'props') {
          const cellNodeProps = (item as any)[property] as ICellNodePopps
          text = cellNodeProps?.ref
            ? generateNoteCellText(cellNodeProps.ref, false)
            : cellNodeProps?.data
          this.insert(
            cellNodeProps.columnId,
            text.trim(),
            item.id,
            searchNodesInner,
          )
        } else {
          const propertyValue = (item as any)[property]
          if (typeof propertyValue === 'object') {
            text = JSON.stringify(propertyValue)
          } else if (typeof propertyValue === 'boolean') {
            text = propertyValue.toString()
          } else {
            text = propertyValue
          }
        }

        this.insert(property, text.trim(), item.id, searchNodesInner)
      })
    })
  }

  private insert(
    property: string,
    text: string,
    id: string,
    searchNodesInner: Map<string, ISearchNode[]>,
  ) {
    const searchNode = searchNodesInner.get(property)
    if (searchNode) {
      searchNode.push({ id, text })
    } else {
      searchNodesInner.set(property, [{ id, text }])
    }
  }

  public search(
    filters: Filter[],
    databaseId: string,
  ): { cellnodes: INode[]; rowKeys: string[] } {
    const cellnodes: INode[] = []
    const rowKeys: string[] = []

    if (
      !this.searchNodes.has(databaseId) ||
      !this.dataSourceMap.has(databaseId)
    ) {
      return {
        cellnodes: [],
        rowKeys: [],
      }
    }

    filters.forEach((item) => {
      if (item.operator === OperatorType.EQUAL) {
        const { rowsKey, nodes } = this.exactMatch(item, databaseId)
        cellnodes.push(...nodes)
        rowKeys.push(...rowsKey)
      } else if (item.operator === OperatorType.CONTAINS) {
        const { rowsKey, nodes } = this.fuzzySearch(item, databaseId)
        cellnodes.push(...nodes)
        rowKeys.push(...rowsKey)
      }
    })

    return { cellnodes, rowKeys }
  }

  private getFilteredNodes(
    nodeCollector: ISearchNode[],
    dataSourceMap: Map<string, INode>,
    processNode: (item: ISearchNode) => boolean,
  ): { nodes: INode[]; rowsKey: string[] } {
    const matchIds = nodeCollector.filter(processNode)

    const nodes = matchIds.map((item) => dataSourceMap.get(item.id)) as INode[]

    return {
      nodes,
      rowsKey: nodes.map((item) => item.props?.rowId || ''),
    }
  }

  private fuzzySearch(
    filter: Filter,
    databaseId: string,
  ): { nodes: INode[]; rowsKey: string[] } {
    const dataSourceMap = this.dataSourceMap.get(databaseId) as Map<
      string,
      INode
    >
    const searchNodes = this.searchNodes.get(databaseId) as Map<
      string,
      ISearchNode[]
    >
    const nodeCollector = searchNodes.get(filter.columnId) || []

    return this.getFilteredNodes(nodeCollector, dataSourceMap, (item) =>
      new RegExp(filter.value, 'i').test(item.text),
    )
  }

  private exactMatch(
    filter: Filter,
    databaseId: string,
  ): { nodes: INode[]; rowsKey: string[] } {
    const dataSourceMap = this.dataSourceMap.get(databaseId) as Map<
      string,
      INode
    >
    const searchNodes = this.searchNodes.get(databaseId) as Map<
      string,
      ISearchNode[]
    >
    const nodeCollector = searchNodes.get(filter.columnId) || []

    return this.getFilteredNodes(
      nodeCollector,
      dataSourceMap,
      (item) => item.text === filter.value,
    )
  }
}
