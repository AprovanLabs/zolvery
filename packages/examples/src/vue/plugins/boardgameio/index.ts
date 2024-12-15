/** Adapted from https://github.com/SaFrMo/vue3-boardgame */

import { Client } from 'boardgame.io/client'
import { Plugin, ref, Ref } from 'vue'

export interface BoardgamePluginOptions {
    /** Whether or not to start the client automatically. If `false`, you must call `.start()` yourself on your game client. Default `true`. */
    autostart?: boolean
    /** Provide `client` if you're initializing the client yourself. Ignores `options` if provided. */
    client?: any
    /** Provide options to let the plugin create the client automatically. */
    options?: any
}

export const BoardgamePlugin: Plugin = {
    install(app, { client, options }: BoardgamePluginOptions) {
        // create client if we have options
        if (!client && options) {
            client = Client(options)
        }

        if (!client) {
            console.warn('Client not created. Include `client` or `options` when installing the plugin.')
            return
        }

        // prep reactive client
        const reactiveClient = ref(client)

        const initialState = reactiveClient.value.getInitialState()

        // prep reactive G
        const G = initialState.G
        // const reactiveG = reactive({ G })
        const reactiveG = ref(G)

        // prep reactive ctx
        const ctx = initialState.ctx
        const reactiveCtx = ref(ctx)

        // subscribe to client updates
        client.subscribe((state: any) => {
            if (!state) return
            reactiveG.value = state.G
            reactiveCtx.value = state.ctx
        })

        // provude
        app.provide('client', reactiveClient)
        app.provide('ctx', reactiveCtx)
        app.provide('G', reactiveG)
        app.provide('moves', reactiveClient.value.moves)
    }
}