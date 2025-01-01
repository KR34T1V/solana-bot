import type { BirdeyeService } from '$lib/services/birdeye.service';
import type { ApiKeyService } from '$lib/services/api-key.service';

let birdeyeService: BirdeyeService;
let apiKeyService: ApiKeyService;

export function setTestServices(birdeye: BirdeyeService, apiKey: ApiKeyService) {
    birdeyeService = birdeye;
    apiKeyService = apiKey;
}

export function getTestServices() {
    return {
        birdeyeService,
        apiKeyService
    };
} 