## Elements

Kossabos Vue components. Import from `@kossabos/vue`

### Misc

#### Button

Simple buttons

<div class="flex flex-col gap-4">
    <div class="flex gap-4">
        <Button icon="icon-house" label="Home" />
        <Button icon="pi pi-replay" label="Restart" />
        <Button icon="pi pi-check" badge="2" variant="outlined" />
    </div>
    <div>
        <Button size="small" icon="pi pi-check" badge="2" label="Small" />
    </div>
    <div>
        <Button size="large" icon="pi pi-ban" label="Large" />
    </div>
</div>

#### Slider

Simple slider

<Slider :step="10" class="w-56" />

#### Hand

Manage a hand of items, often playing cards.

<div class="flex flex-col items-center justify-center gap-8">
    <div class="flex gap-4">
        <Dropzone component="PlayingCard" label="Flop" :shape="3" :dimensions="['4rem', '6rem']" />
        <Dropzone component="PlayingCard" label="Turn" :shape="1" :dimensions="['4rem', '6rem']" />
        <Dropzone component="PlayingCard" label="River" :shape="1" :dimensions="['4rem', '6rem']" />
    </div>
    <Hand
        component="PlayingCard"
        :hand="[
            { name: '9', suit: 'hearts' },
            { name: 'K', suit: 'spades' },
            { name: 'Q', suit: 'diamonds' },
            { name: 'A', suit: 'clubs' },
        ]"
    />
</div>

Can handle larger hands

<div class="flex flex-col items-center justify-center gap-8">
    <Hand
        component="PlayingCard"
        :hand="[
            { name: '9', suit: 'hearts' },
            { name: 'K', suit: 'spades' },
            { name: 'Q', suit: 'diamonds' },
            { name: 'A', suit: 'clubs' },
            { name: '2', suit: 'clubs' },
            { name: '3', suit: 'clubs' },
            { name: '4', suit: 'clubs' },
            { name: '5', suit: 'clubs' },
            { name: '6', suit: 'clubs' },
            { name: '7', suit: 'clubs' },
            { name: '8', suit: 'clubs' },
            { name: '9', suit: 'clubs' },
            { name: '10', suit: 'clubs' },
            { name: 'J', suit: 'clubs' },
            { name: 'Q', suit: 'clubs' },
            { name: 'K', suit: 'clubs' },
        ]"
    />

</div>

#### Playing Card

Typical playing cards.

<div class="flex gap-2">
    <PlayingCard suit="hearts" name="9" />
    <PlayingCard suit="spades" name="K" />
    <PlayingCard suit="clubs" name="A" />
    <PlayingCard suit="diamonds" name="Q" disabled />
</div>

Blank cards showing back. Color can be controlled via `currentColor`.

<div class="flex gap-4">
    <PlayingCard class="text-primary" pattern="striped" hidden />
    <PlayingCard pattern="bordered" hidden />
</div>

#### Avatar

Track multiple metrics and display a countdown timer.

<Avatar
    size="xlarge"
    image="https://avatars.githubusercontent.com/u/98067664?s=200&v=4"
    :countdown="10"
    :primary="{ value: 1, severity: 'danger'}"
    :secondary="{ value: 2, severity: 'info' }"
/>

Mark avatars with decoration.

<div class="flex gap-4">
    <Avatar
        image="https://avatars.githubusercontent.com/u/98067664?s=200&v=4"
        :decoration="{ icon: 'heroicon heroicon-arrow-up' }"
    />
    <Avatar
        image="https://avatars.githubusercontent.com/u/98067664?s=200&v=4"
        :decoration="{ icon: 'heroicon heroicon-star' }"
    />
</div>

Display actions taken by avatars

<div class="flex gap-4">
    <Avatar
        size="xlarge"
        image="https://avatars.githubusercontent.com/u/98067664?s=200&v=4"
        :action="{ value: 'Bid 1', position: 'left' }"
    />
    <Avatar
        size="xlarge"
        image="https://avatars.githubusercontent.com/u/98067664?s=200&v=4"
        :action="{ value: 'Passed Go', timeout: 3 }"
    />
    <Avatar
        size="xlarge"
        image="https://avatars.githubusercontent.com/u/98067664?s=200&v=4"
        :action="{ value:'<span class=\'font-bold white-space-nowrap\'>Bid</span> 6', position: 'bottom' }"
    />
    <Avatar
        size="xlarge"
        image="https://avatars.githubusercontent.com/u/98067664?s=200&v=4"
        :action="{ value: '<span class=\'flex heroicon heroicon-star\'></span>', position: 'right' }"
    />
</div>
