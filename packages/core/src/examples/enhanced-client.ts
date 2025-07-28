/**
 * Example demonstrating the enhanced Kossabos client API
 * This shows how to migrate from the old inject-based system to the new event-driven client
 */
import { Client, ClientConfig, CoreEventType, ClientEvent } from '../index.js';

// Example: Poetry Slam game using the new client API
export const createEnhancedPoetrySlam = (clientConfig: ClientConfig) => {
  const user = {
    userId: 'user123',
    username: 'PoetryMaster',
    isHost: false,
    userLocale: 'en-US' as const,
  };

  // Create transport (would typically be provided by the framework)
  const transport = {
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  };

  // Initialize client
  const client = new Client(user, clientConfig, transport);

  // Setup event handlers
  client.on(CoreEventType.APP_INITIALIZED, (event: ClientEvent) => {
    console.log('App initialized:', event.data);
    loadGameData();
  });

  client.on(CoreEventType.SCORE_ACCEPTED, (event: ClientEvent) => {
    console.log('Score accepted:', event.data);
    showSuccessMessage();
  });

  client.on(CoreEventType.SCORE_REJECTED, (event: ClientEvent) => {
    console.log('Score rejected:', event.data);
    showErrorMessage(event.data.reason);
  });

  // Custom game event handlers
  client.on('poem.submitted', (event: ClientEvent) => {
    console.log('Poem submitted:', event.data);
    startVotingPhase();
  });

  client.on('vote.cast', (event: ClientEvent) => {
    console.log('Vote cast:', event.data);
    updateVoteDisplay(event.data);
  });

  // Game logic functions
  const loadGameData = () => {
    // Get daily prompt and context
    const data = client.get('data');
    const context = client.get('context');
    const prompt = data?.prompt || 'Write a haiku about nature.';
    
    console.log('Daily prompt:', prompt);
    console.log('Game context:', context);
  };

  const submitPoem = (poemText: string) => {
    // Submit poem as custom event
    client.emit('poem.submit', {
      text: poemText,
      timestamp: Date.now(),
      wordCount: poemText.split(' ').length,
    });
  };

  const castVote = (targetUserId: string, score: number) => {
    // Submit vote
    client.emit('vote.cast', {
      targetUserId,
      score,
      timestamp: Date.now(),
    });
  };

  const submitFinalScore = (totalScore: number, metadata: any) => {
    // Check if already submitted today
    if (client.hasSubmittedScoreToday()) {
      console.warn('Score already submitted today');
      return;
    }

    // Submit final score (this is a core event with special handling)
    client.emit(CoreEventType.SCORE_SUBMIT, {
      score: totalScore,
      metadata: {
        ...metadata,
        gameMode: 'poetry-slam',
        version: '1.0',
      },
    });
  };

  const startVotingPhase = () => {
    // Custom game logic
    console.log('Starting voting phase...');
  };

  const updateVoteDisplay = (voteData: any) => {
    // Update UI with vote information
    console.log('Updating vote display:', voteData);
  };

  const showSuccessMessage = () => {
    console.log('✅ Score submitted successfully!');
  };

  const showErrorMessage = (reason: string) => {
    console.error('❌ Score submission failed:', reason);
  };

  // Initialize the client
  client.initialize().then(() => {
    console.log('Client ready for gameplay');
  }).catch((error: Error) => {
    console.error('Failed to initialize client:', error);
  });

  // Return public interface
  return {
    client,
    submitPoem,
    castVote,
    submitFinalScore,
    // Access to client methods
    get: client.get,
    set: client.set,
    on: client.on,
    emit: client.emit,
    t: client.t,
    env: client.env,
  };
};

// Example configuration
const exampleConfig: ClientConfig = {
  appId: 'poetry-slam',
  apiBaseUrl: 'https://api.kossabos.com',
  environment: 'production',
  locale: 'en-US',
  enableCaching: true,
  batchEvents: false,
  retryFailedEvents: true,
};

console.log('Example config created:', exampleConfig.appId);

// Example of how to use in a Vue component (similar to original)
export const usePoetrySlam = () => {
  // This would be provided by a Vue plugin or similar
  const client = useKossabosClient(); // hypothetical hook
  
  return {
    // Familiar interface similar to inject('kossabos')
    get: client.get,
    set: client.set,
    emit: client.emit,
    on: client.on,
    t: client.t,
    env: client.env,
    
    // Enhanced methods
    hasSubmittedScoreToday: client.hasSubmittedScoreToday,
    initialize: client.initialize,
  };
};

// Migration helper - provides backwards compatibility
export const createLegacyKossabosInterface = (client: Client) => {
  return {
    get: client.get,
    set: client.set,
    emit: client.emit,
    on: client.on,
    t: client.t,
    env: client.env,
  };
};

// Hypothetical Vue plugin integration
declare const useKossabosClient: () => Client;
