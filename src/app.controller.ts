import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('/morning')
  goodMorning() {
    return 'Good Morning!';
  }

  @Get('/afternoon')
  goodAfternoon() {
    return 'Good Afternoon!';
  }

  @Get('/evening')
  goodEvening() {
    return 'Good Evening!';
  }
}