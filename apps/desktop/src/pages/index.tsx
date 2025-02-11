import { Box } from '@fower/react'
import { Inter } from 'next/font/google'
import Head from 'next/head'
import { DesktopHome } from '@penx/app'

const inter = Inter({ subsets: ['latin'] })

export default function Home() {
  return (
    <>
      <Head>
        <title>PenX</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Box className={`${inter.className}`} toCenter h-100vh>
        <DesktopHome></DesktopHome>
      </Box>
    </>
  )
}
