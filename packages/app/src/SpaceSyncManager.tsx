import { FC, PropsWithChildren, useEffect, useRef, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Box } from '@fower/react'
import { useAtom } from 'jotai'
import { Spinner } from 'uikit'
import { useDidMount } from '@penx/hooks'
import { db } from '@penx/local-db'
import { ISpace } from '@penx/model-types'
import { appLoadingAtom, spacesAtom, store, StoreProvider } from '@penx/store'
import { api } from '@penx/trpc-client'
import { CreateSpaceForm } from './Workbench/CreateSpaceModal/CreateSpaceForm'

interface Props {
  userId: string
}

export const SpaceSyncManager = ({
  children,
  userId,
}: PropsWithChildren<Props>) => {
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [spaces, setSpaces] = useAtom(spacesAtom)

  async function loadCloudSpaces(): Promise<ISpace[] | undefined> {
    try {
      setSyncing(true)
      const remoteSpaces = await api.space.mySpaces.query()

      console.log('=======remoteSpaces:', remoteSpaces)

      if (!remoteSpaces?.length) return

      for (const space of remoteSpaces) {
        await db.createSpace(space as any, false)
      }

      const spaces = await db.listSpaces()

      return spaces
    } catch (error) {
      console.log('========error:', error)
    } finally {
      setSyncing(false)
    }
  }

  async function loadSpaces() {
    const t0 = Date.now()
    let spaces = await db.listSpaces(userId)

    // navigator.onLine

    if (!spaces?.length) {
      const cloudSpaces = await loadCloudSpaces()
      if (cloudSpaces?.length) {
        spaces = cloudSpaces
      }
    }

    setSpaces(spaces)
    setLoading(false)

    const t1 = Date.now()
    console.log('loadSpaces time', t1 - t0)
  }

  useDidMount(() => {
    loadSpaces()
  })

  if (syncing) {
    return (
      <Box h-90vh toCenter>
        <Box column toCenter gap2>
          <Spinner></Spinner>
          <Box>Syncing..</Box>
        </Box>
      </Box>
    )
  }

  if (loading) return null

  if (!spaces.length) {
    return (
      <Box h-90vh toCenter>
        <Box w-400>
          <Box fontSemibold text3XL mb4>
            Create new space
          </Box>
          <CreateSpaceForm showCancel={false} />
        </Box>
      </Box>
    )
  }

  return <>{children}</>
}
